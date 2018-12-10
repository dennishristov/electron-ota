import bind from 'bind-decorator'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt-nodejs'
import User, { UserDocument, RegisterPreHook } from '../models/User'
import { AUTH_PRIVATE_KEY, AUTH_PUBLIC_KEY, AUTH_TOKEN_SALT } from '../util/env'
import { 
	IUserLoginRequest,
	IUserLoginResponse,
	IUserAuthenticationRequest,
	IUserAuthenticationResponse
} from 'shared'
import { HookNextFunction } from 'mongoose';

export interface IUserService {
	handleLogin(userLoginRequest: IUserLoginRequest): Promise<IUserLoginResponse>
	handleAuthentication(userAuthenticationRequest: IUserAuthenticationRequest): Promise<IUserAuthenticationResponse>
}

export default class UserService {
	// private readonly authenticatedUsers: IAuthenticatedUser[]

	constructor() {
		RegisterPreHook("save", this.hashPasswordHook)
	}

	@bind
	async handleLogin({ email, password }: IUserLoginRequest): Promise<IUserLoginResponse> {
		try {
			const user = await User.findOne({ email })
			
			if (!await this.doesPasswordMatch(password, user.password)) {
				throw new Error('Invalid password')
			}

			const authToken = this.generateToken(user._id)
			this.hashAuthToken(authToken).then(hashedToken => {
				user.authTokens.push(hashedToken)
				user.save()
			})

			return { 
				isAuthenticated: true,
				authToken
			}
		} catch (error) {
			console.log(error)
			return { 
				isAuthenticated: false,
				errorMessage: error.message
			}
		}
	}

	@bind
	async handleAuthentication({ authToken }: IUserAuthenticationRequest): Promise<IUserAuthenticationResponse> {
		try {
			const { id, exp } = jwt.verify(authToken, AUTH_PUBLIC_KEY, { algorithms: ["RS256"] }) as any

			if (!id) {
				throw new Error('Bad id')
			}

			const user = await User.findById(id)

			if (!user) {
				throw new Error('Invalid token')
			}

			const hashedToken = await this.hashAuthToken(authToken)
 
			return {
				isAuthenticated: Boolean(user.authTokens.find(token => token === hashedToken))
			}
		} catch (error) {
			console.log(error)
			return {
				isAuthenticated: false,
				errorMessage: error.message
			}
		}
	}

	@bind
	private generateToken(userId: string, expiresIn: string = '30d'): string {
		return jwt.sign({ id: userId }, AUTH_PRIVATE_KEY, { expiresIn, algorithm: "RS256" })
	}

	@bind 
	private doesPasswordMatch(password: string, hashedPassword: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			bcrypt.compare(password, hashedPassword, (error, isMatch: boolean) => {
				error && reject(error)
				resolve(isMatch)
			})
		})
	}	

	@bind
	private hashAuthToken(authToken: string): Promise<string> {
		return new Promise((resolve, reject) => {
			bcrypt.hash(authToken, AUTH_TOKEN_SALT, void 0, (error, result) => {
				error && reject(error)
				resolve(result)
			})
		})
	}

	private hashPasswordHook(this: UserDocument, next: HookNextFunction): void {
		if (!this.isModified("password")) { 
			return next()
		}
	
		bcrypt.genSalt(10, (error, salt) => {
			if (error) { 
				return next(error)
			}
	
			bcrypt.hash(this.password, salt, void 0, (error: Error, hash) => {
				if (error) { 
					return next(error)
				}
					 
				this.password = hash
				next()
			})
		})
	}
}
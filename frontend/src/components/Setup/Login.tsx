import { inject, observer } from 'mobx-react'
import React, { FormEvent } from 'react'

import { IUserStore } from '../../stores/UserStore'

import { injectUserStore } from '../../stores/RootStore'
import Input from '../Generic/Input'
import { isEmail } from '../../util/functions'
import Button from '../Generic/Button'
import { Redirect, RouterProps } from 'react-router'
import Flex from '../Generic/Flex'

import User from '../../img/User.svg'
import Key from '../../img/Key.svg'
import Container from '../Generic/Container'

import styles from '../../styles/LoginPage.module.sass'
import Loading from '../Generic/Loading'

interface ILoginFormEvent extends FormEvent<HTMLFormElement> {
	target: EventTarget & {
		elements: {
			nameOrEmail: HTMLInputElement,
			password: HTMLInputElement,
		},
	}
}

interface IProps extends RouterProps {
	userStore: IUserStore
	style: React.CSSProperties
}

class Login extends React.Component<IProps> {

	@bind
	public async handleSubmit(event: ILoginFormEvent) {
		event.preventDefault()

		const { nameOrEmail, password } = event.target.elements

		const { value: input } = nameOrEmail
		const inputIsEmail = isEmail(input)

		const isSuccessful = await this.props.userStore.login({
			name: inputIsEmail ? void 0 : input,
			email: inputIsEmail ? input : void 0,
			password: password.value,
		})

		isSuccessful && this.props.history.push('/apps')

	}

	public render() {
		return (
			<Container style={this.props.style}>
				{this.props.userStore.isLoading
					? <Loading />
					: (
						<form onSubmit={this.handleSubmit}>
							<Flex column list>
								<h1>Sign in</h1>
								<Input
									label='Username'
									type='text'
									name='nameOrEmail'
									required
									icon={User}
									/>
								<Input
									label='Password'
									type='password'
									name='password'
									icon={Key}
									required
									/>
								<Flex>
									<Button color='white' type='button' onClick={this.goToSetup}>
										Sign up
									</Button>
									<Button color='blue' type='submit'>
										Submit
									</Button>
								</Flex>
							</Flex>
						</form>
					)
				}
			</Container>
		)
	}

	@bind
	private goToSetup() {
		this.props.history.push('/setup')
	}
}

export default inject(injectUserStore)(observer(Login))
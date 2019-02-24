import os from 'os'
import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'

import download from 'download'
import semver from 'semver'
import Store from 'electron-store'
import { app } from 'electron'

import { Server, UpdateService } from './enums'

import {
	INewUpdate,
	IUpdateResponse,
	IUpdateInfo,
	IUpdateServiceOptions,
	IRegistrationResponse,
	IUpdateService,
} from './interfaces'

import {
	hashFile,
	readdir,
	unlink,
	hashFileSync,
	buildConnectionAsync,
	exists,
	normalizeOptions,
} from './functions'

declare global {
	namespace NodeJS {
		// tslint:disable-next-line:interface-name
		interface Process {
			noAsar?: boolean
		}
	}
}

// tslint:disable-next-line:interface-name
declare interface ElectronUpdateServiceClient {
	on(event: 'update', listener: (info: IUpdateInfo) => void): this
	on(event: 'error', listener: (error: Error) => void): this
}

class ElectronUpdateServiceClient extends EventEmitter implements IUpdateService {
	private static readonly EMIT_TIMEOUT = 1000 * 60

	private readonly updateDirPath: string

	private readonly downloadsStore = new Store({ name: 'updater' })

	private readonly sessionStore = new Store({ name: 'session' })

	private readonly options: IUpdateServiceOptions

	private readonly connectionPromise: Promise<SocketIOClient.Socket>

	constructor(options: IUpdateServiceOptions) {
		super()

		this.options = normalizeOptions(options)

		this.updateDirPath = path.join(options.userDataPath || app.getPath('userData'), 'updates')

		if (!this.options.versionName) {
			throw new Error('Version name was not provided and is missing from package.json.')
		}

		const query = `versionName=${options.versionName}`
		const uri = `${options.updateServerUrl}/${options.bundleId}/${os.type()}`

		this.connectionPromise = buildConnectionAsync(uri, query)

		this.connectionPromise.then((connection) => {
			if (this.options.checkForUpdateOnConnect) {
				connection.on(Server.Connect, this.checkForUpdate.bind(this))
			}

			this.register()

			connection.on(Server.NewUpdate, this.downloadUpdate.bind(this))
		})
	}

	public async loadLatestUpdate(): Promise<any> {
		try {
			if (await exists(this.updateDirPath)) {
				return null
			}

			const files = await readdir(this.updateDirPath)

			const updates = files.filter((filename) => filename.endsWith('.asar')).sort()

			if (!updates.length) {
				return null
			}

			const [latestUpdateFilename] = updates.splice(updates.length - 1, 1)
			const latestUpdatePath = path.join(this.updateDirPath, latestUpdateFilename)

			const updateInfo = this.downloadsStore.get(latestUpdateFilename)

			if (!updateInfo || !semver.lt(this.options.versionName, updateInfo.versionName)) {
				return null
			}

			if (this.options.checkHashBeforeLoad) {
				if (updateInfo.hash) {
					const fileHash = await hashFile(latestUpdatePath)

					if (updateInfo.hash !== fileHash) {
						this.emit(UpdateService.Error, 'Hashes do not match')
						return null
					}
				}
			}

			const updateModule = require(latestUpdatePath)

			for (const filename of updates) {
				unlink(path.join(this.updateDirPath, filename))
			}

			this.emitToServer(Server.Using, {
				versionId: updateInfo.versionId,
				id: this.clientId,
			})

			this.dispose()

			return updateModule
		} catch (error) {
			this.emit(UpdateService.Error, error)

			return null
		}
	}

	public loadLatestUpdateSync(): any {
		try {
			if (!fs.existsSync(this.updateDirPath)) {
				return null
			}

			const files = fs.readdirSync(this.updateDirPath)

			const updates = files.filter((filename) => filename.endsWith('.asar')).sort()

			if (!updates.length) {
				return null
			}

			const [latestUpdateFilename] = updates.splice(updates.length - 1, 1)
			const latestUpdatePath = path.join(this.updateDirPath, latestUpdateFilename)

			const updateInfo = this.downloadsStore.get(latestUpdateFilename)

			if (!updateInfo || !semver.lt(this.options.versionName, updateInfo.versionName)) {
				return null
			}

			if (this.options.checkHashBeforeLoad) {
				if (!updateInfo.hash) {
					this.emit(UpdateService.Error, 'Hashes do not match')
					return null
				}

				const fileHash = hashFileSync(latestUpdatePath)

				if (updateInfo.hash !== fileHash) {
					this.emit(UpdateService.Error, 'Hashes do not match')
					return null
				}
			}

			const updateModule = require(latestUpdatePath)

			for (const filename of updates) {
				unlink(path.join(this.updateDirPath, filename))
			}

			this.emitToServer(Server.Using, {
				versionId: updateInfo.versionId,
				id: this.clientId,
			})

			this.dispose()

			return updateModule
		} catch (error) {
			this.emit(UpdateService.Error, error)

			return null
		}
	}

	public async checkForUpdate(): Promise<boolean> {
		const { versionName, bundleId } = this.options

		const { isUpToDate, update } = await this.emitToServer(
			Server.CheckForUpdate,
			{
				versionName,
				bundleId,
				systemType: os.type(),
			},
		) as IUpdateResponse

		if (!isUpToDate) {
			this.downloadUpdate(update)
		}

		return isUpToDate
	}

	private async dispose() {
		const connection = await this.connectionPromise

		connection.disconnect()
	}

	private get clientId(): string | void {
		return this.sessionStore.get('clientId')
	}

	private async register() {
		if (!this.clientId) {
			const { id } = await this.emitToServer(Server.Register, {
				systemType: os.type(),
				username: os.userInfo().username,
				osRelease: os.release(),
			}) as IRegistrationResponse

			this.sessionStore.set('clientId', id)
		}
	}

	private async downloadUpdate(args: INewUpdate) {
		const { downloadUrl, ...update } = args

		const filename = `${update.versionName}.asar`
		const filePath = path.join(this.updateDirPath, filename)

		const updateInfo = {
			fileName: filename,
			filePath,
			...update,
		}

		if (
			semver.gt(this.options.versionName, update.versionName)
			|| this.downloadsStore.has(`${args.versionName}.asar`)
		) {
			return
		}

		if (!downloadUrl) {
			this.emit(UpdateService.Update, updateInfo)
		}

		const report = {
			id: this.clientId,
			versionId: update.versionId,
		}

		this.emitToServer(Server.Downloading, report)

		try {
			process.noAsar = true

			await download(downloadUrl, this.updateDirPath, { filename })

			this.emitToServer(Server.Downloaded, report)

			if (this.options.checkHashAfterDownload) {
				const hash = await hashFile(filePath)

				if (update.hash !== hash) {
					throw new Error('Invalid hash')
				}
			}

			this.downloadsStore.set(filename, updateInfo)

			this.emit(UpdateService.Update, updateInfo)
		} catch (error) {
			this.emitToServer(Server.Error, {
				errorMessage: error.errorMessage || error.stack,
				...report,
			})

			this.emit(UpdateService.Error, error)

			setTimeout(
				this.downloadUpdate.bind(this, args),
				this.options.retryTimeout,
			)
		} finally {
			process.noAsar = false
		}
	}

	private emitToServer(eventType: Server, data?: object): Promise<object> {
		return new Promise((resolve, reject) => {
			this.connectionPromise.then((connection) => {
				const timeout = setTimeout(
					() => reject(eventType + ' timeout'),
					ElectronUpdateServiceClient.EMIT_TIMEOUT,
				)

				connection.emit(eventType, data, (response: object) => {
					clearTimeout(timeout)
					resolve(response)
				})
			})
		})
	}
}

export default ElectronUpdateServiceClient

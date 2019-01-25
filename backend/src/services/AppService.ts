
import { Model } from 'mongoose'
import {
	ICreateAppRequest,
	ICreateAppResponse,
	IDeleteAppRequest,
	IDeleteAppResponse,
	IGetAppsResponse,
	IUpdateAppRequest,
	IUpdateAppResponse,
	SystemType,
} from 'shared'
import { IAppDocument } from '../models/App'
import { plain } from '../util/util'
import { IVersionDocument } from '../models/Version'
import { IReleaseDocument } from '../models/Release'

export interface IAppService {
	getApp(id: string, options?: IGetAppOptions): Promise<IAppDocument>
	getAppVersions(id: string): Promise<{ versions: IVersionDocument[] }>
	getAppLatestVersion(id: string, systemType: SystemType): Promise<IVersionDocument>
	getAllApps(): Promise<IGetAppsResponse>
	createApp(createRequest: ICreateAppRequest): Promise<ICreateAppResponse>
	updateApp(updateRequest: IUpdateAppRequest): Promise<IUpdateAppResponse>
	deleteApp(deleteRequest: IDeleteAppRequest): Promise<IDeleteAppResponse>
}

interface IGetAppOptions {
	versions?: boolean
	latestVersions?: boolean
}

@DI.injectable()
export default class AppService implements IAppService {
	constructor(
		@DI.inject(DI.Models.App)
		private readonly apps: Model<IAppDocument>,
	) {}

	public async getApp(
		id: string,
		{ versions, latestVersions }: IGetAppOptions = { versions: false, latestVersions: false },
	): Promise<IAppDocument> {
		const populate = [
			versions && 'versions',
			latestVersions && 'latestVersions',
		].filter(Boolean).join(' ')

		return await this.apps
			.findById(id)
			.populate(populate)
	}

	public async getAppVersions(id: string): Promise<{ versions: IVersionDocument[] }> {
		return await this.apps
			.findById(id)
			.populate('versions')
			.select('versions')
			.sort({ 'versions.updatedAt': 1 })
	}

	@bind
	public async getAllApps(): Promise<IGetAppsResponse> {
		const apps = await this.apps.find().populate('latestVersions')

		return {
			apps: apps.map(plain).map((app) => ({ ...app, versions: app.versions.length })),
		}
	}

	@bind
	public async createApp(createRequest: ICreateAppRequest): Promise<ICreateAppResponse> {
		const app = await this.apps.create({ ...createRequest, latestVersions: {
			Windows_RT: null,
			Darwin: null,
			Linux: null,
		}})

		const { versions, ...rest } = plain(app)

		return { ...rest, versions: versions.length }
	}

	@bind
	public async updateApp(updateRequest: IUpdateAppRequest): Promise<IUpdateAppResponse> {
		const { id, ...app } = updateRequest
		await this.apps.updateOne({ _id: id }, { $set: app })
		return updateRequest
	}

	@bind
	public async deleteApp({ id }: IDeleteAppRequest): Promise<IDeleteAppResponse> {
		await this.apps.deleteOne({ _id: id })
		return { id }
	}

	public async getAppLatestVersion(id: string, systemType: SystemType) {
		if (!Object.values(SystemType).includes(systemType)) {
			throw new Error('wrong type')
		}

		const { latestVersions } = await this.apps
			.findById(id)
			.populate({
				path: 'latestVersions',
				populate: {
					path: 'version',
				},
			})
			.select('latestVersions')

		return latestVersions[systemType]
	}
}

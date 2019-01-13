
import { Model } from 'mongoose'
import {
	IGetVersionRequest,
	ICreateVersionRequest,
	ICreateVersionResponse,
	IDeleteVersionRequest,
	IDeleteVersionResponse,
	IGetVersionsResponse,
	IUpdateVersionRequest,
	IUpdateVersionResponse,
	IGetVersionResponse,
	IGetVersionsRequest,
} from 'shared'
import { IVersionDocument } from '../models/Version'
import { toPlain } from '../util/util'
import { IAppDocument } from '../models/App'

export interface IVersionService {
	versions: Model<IVersionDocument>
	getVersion({ id }: IGetVersionRequest): Promise<IGetVersionResponse>
	getVersions({ appId }: IGetVersionsRequest): Promise<IGetVersionsResponse>
	createVersion(createRequest: ICreateVersionRequest): Promise<ICreateVersionResponse>
	updateVersion(updateRequest: IUpdateVersionRequest): Promise<IUpdateVersionResponse>
	deleteVersion({ id }: IDeleteVersionRequest): Promise<IDeleteVersionResponse>
}

@DI.injectable()
export default class VersionService implements IVersionService {
	constructor(
		@DI.inject(DI.Models.Version)
		public readonly versions: Model<IVersionDocument>,
		@DI.inject(DI.Models.App)
		private readonly apps: Model<IAppDocument>,
	) {}

	@bind
	public async getVersion({ id }: IGetVersionRequest): Promise<IGetVersionResponse> {
		const version = await this.versions.findById(id)

		return toPlain(version)
	}

	@bind
	public async getVersions({ appId }: IGetVersionsRequest): Promise<IGetVersionsResponse> {
		const { versions } = await this.apps.findById(appId).populate('versions')

		return {
			versions: versions.map(toPlain),
		}
	}

	@bind
	public async createVersion(create: ICreateVersionRequest): Promise<ICreateVersionResponse> {
		const version = await this.versions.create(create)

		await this.apps.findByIdAndUpdate(create.appId, {
			$push: {
				versions: version,
			},
		})

		return toPlain(version)
	}

	@bind
	public async updateVersion(update: IUpdateVersionRequest): Promise<IUpdateVersionResponse> {
		await this.versions.findByIdAndUpdate(update.id, update)
		return update
	}

	@bind
	public async deleteVersion({ id, appId }: IDeleteVersionRequest): Promise<IDeleteVersionResponse> {
		await this.versions.findByIdAndRemove(id)
		return { id, appId }
	}

	@bind
	public async getVersionStatistics(id: string) {
		// const { releases } = await this.versions.findById(id).populate({
		// 	path: 'statistics',
		// 	populate: {
		// 		path: 'statistics',
		// 		populate: {
		// 			path: 'downloading downloaded',
		// 		},
		// 	},
		// }).select('releases')

		// return { releases }
	}
}

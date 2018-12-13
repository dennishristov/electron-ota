import App, { AppDocument } from '../models/App'
import { 
	ICreateAppRequest,
	ICreateAppResponse,
	IUpdateAppRequest,
	IUpdateAppResponse,
	IDeleteAppRequest,
	IDeleteAppResponse
} from 'shared'

export interface IAppService {
	getApps(): Promise<any>
	createApp(createRequest: ICreateAppRequest): Promise<ICreateAppResponse>
	updateApp(updateRequest: IUpdateAppRequest): Promise<IUpdateAppResponse>
	deleteApp(deleteRequest: IDeleteAppRequest): Promise<IDeleteAppResponse>
}

export default class AppService {
	async getApps(): Promise<any> {
		const apps = await App.find()

		return apps.map(({
			id,
			bundleId,
			pictureUrl,
			name
		}) => ({
			id,
			bundleId,
			pictureUrl,
			name
		})).toObject(app => [app.id, app])
	}

	async createApp(createRequest: ICreateAppRequest): Promise<ICreateAppResponse> {
		const {
			id,
			pictureUrl,
			bundleId,
			name,
		} = await App.create(createRequest)

		return {
			id,
			pictureUrl,
			bundleId,
			name
		}
	}

	async updateApp(updateRequest: IUpdateAppRequest): Promise<IUpdateAppResponse> {
		const { id, ...app } = updateRequest
		await App.find(id, { $set: app })
		return null  
	}

	async deleteApp({ id }: IDeleteAppRequest): Promise<IDeleteAppResponse> {
		await App.deleteOne({ _id: id })
		return { id }
	}
}
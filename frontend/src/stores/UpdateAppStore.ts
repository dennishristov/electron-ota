import { IAppModalStore } from './AppModalStore'
import { IAppsStore } from './AppsStore'
import { IUploadService } from '../services/UploadService'

interface IFormData {
	id: string
	name?: string
}

export interface IUpdateAppStore {
	appModalStore: IAppModalStore
	handleEdit(data: IFormData): Promise<void>
}

@DI.injectable()
export default class UpdateAppStore implements IUpdateAppStore {
	constructor(
		@DI.inject(DI.Stores.Apps)
		private readonly appsStore: IAppsStore,
		@DI.inject(DI.Services.Upload)
		private readonly uploadService: IUploadService,
		@DI.inject(DI.Stores.AppModal)
		public readonly appModalStore: IAppModalStore,
	) {}

	@bind
	public async handleEdit({ name, id }: IFormData) {
		let pictureUrl

		const { picture, color } = this.appModalStore

		if (picture) {
			const upload = await this.uploadService.uploadPicture(picture)

			await upload.upload

			pictureUrl = upload.downloadUrl
		}

		await this.appsStore.updateApp({
			id,
			name,
			pictureUrl,
			color,
		})
	}
}

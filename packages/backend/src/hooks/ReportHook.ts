
import { EventType, ErrorReportRequest, ClientReportRequest } from 'shared'
import { IPostRespondHook, ISocketMediator } from '../util/mediator/interfaces'
import { IClientService } from '../services/ClientService'
import { Version } from '../models/Version'
import {  ModelType } from 'typegoose'

@DI.injectable()
export default class ReportHook implements IPostRespondHook {
	public eventTypes = new Set([
		EventType.UpdateDownloading,
		EventType.UpdateDownloaded,
		EventType.UpdateUsing,
		EventType.UpdateError,
	])

	constructor(
		@DI.inject(DI.Mediators)
		private readonly mediators: Map<string, ISocketMediator>,
		@DI.inject(DI.Services.Client)
		private readonly clientsService: IClientService,
		@DI.inject(DI.Models.Version)
		public readonly versions: ModelType<Version>,
	) {}

	@bind
	public async handle(
		eventType: EventType,
		{ id, versionId, ...rest }: ClientReportRequest | ErrorReportRequest,
	) {
		const client = await this.clientsService.getClient(id)
		const { appId } = await this.versions.findById(versionId).select('app')
		const a = new this.versions()
		this.mediators.get(DI.AdminMediator).broadcast(eventType, {
			client,
			versionId,
			appId,
			...rest,
		})
	}
}
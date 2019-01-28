import { Container } from 'inversify'

import AppService, { IAppService } from '../services/AppService'
import AdminsService, { IAdminsService } from '../services/AdminsService'
import VersionService, { IVersionService } from '../services/VersionService'
import S3Service, { IFileUploadService } from '../services/S3Service'
import RegisterCredentialsService, { IRegisterCredentialsService } from '../services/RegisterAdminService'
import ClientService, { IClientService } from '../services/ClientService'
import ReleaseService, { IReleaseService } from '../services/UpdateService'
import VersionStatisticsService, { IVersionStatisticsService } from '../services/VersionStatisticsService'

import { Model, model as createModel } from 'mongoose'

import { IAppDocument, AppSchema } from '../models/App'
import { IAdminDocument, IAdminSchema } from '../models/Admin'
import { IVersionDocument, VersionSchema } from '../models/Version'
import { IReleaseDocument, ReleaseSchema } from '../models/Release'
import { IVersionStatisticsDocument, VersionStatisticSchema } from '../models/VersionStatistics'
import { IClientDocument, ClientSchema } from '../models/Client'
import { ADMIN, APP, VERSION, RELEASE, VERSION_STATISTICS, CLIENT } from '../models/constants'

import AuthHook from '../hooks/AuthHook'
import ReportHook from '../hooks/ReportHook'
import ReleaseUpdateHook from '../hooks/ReleaseUpdateHook'
import CreateClientsMediatorHook from '../hooks/CreateClientsMediatorHook'

import http from 'http'
import socketio from 'socket.io'

import { S3_CONFIG, ENVIRONMENT, PORT } from '../config/config'

import adminMediatorFactory from './factories/AdminMediatorFactory'
import clientsMediatorFactory, { ClientsMediatorFactory } from './factories/ClientsMediatorFactory'

import { IPreRespondHook, IPostRespondHook, ISocketMediator } from '../util/mediator/Interfaces'

const container = new Container()

container.bind<http.Server>(DI.HTTPServer)
	.toConstantValue(http.createServer().listen(PORT, () => {
		// tslint:disable-next-line:no-console
		console.log(
			'App is running at http://localhost:%d in %s mode',
			PORT,
			ENVIRONMENT,
		)
	}))

container.bind<SocketIO.Server>(DI.SocketServer)
	.toDynamicValue((context) => {
		return socketio(context.container.get<http.Server>(DI.HTTPServer))
	})
	.inSingletonScope()

container.bind<IAdminsService>(DI.Services.Admin)
	.to(AdminsService)
	.inSingletonScope()

container.bind<IAppService>(DI.Services.App)
	.to(AppService)
	.inSingletonScope()

container.bind<IVersionService>(DI.Services.Version)
	.to(VersionService)
	.inSingletonScope()

container.bind<IFileUploadService>(DI.Services.FileUpload)
	.toConstantValue(new S3Service(S3_CONFIG))

container.bind<IRegisterCredentialsService>(DI.Services.RegisterCredentials)
	.to(RegisterCredentialsService)
	.inSingletonScope()

container.bind<IReleaseService>(DI.Services.Update)
	.to(ReleaseService)
	.inSingletonScope()

container.bind<IClientService>(DI.Services.Client)
	.to(ClientService)
	.inSingletonScope()

container.bind<IVersionStatisticsService>(DI.Services.VersionStatistics)
	.to(VersionStatisticsService)
	.inSingletonScope()

container.bind<Model<IAdminDocument>>(DI.Models.Admin)
	.toConstantValue(createModel(ADMIN, IAdminSchema))

container.bind<Model<IAppDocument>>(DI.Models.App)
	.toConstantValue(createModel(APP, AppSchema))

container.bind<Model<IVersionDocument>>(DI.Models.Version)
	.toConstantValue(createModel(VERSION, VersionSchema))

container.bind<Model<IReleaseDocument>>(DI.Models.Update)
	.toConstantValue(createModel(RELEASE, ReleaseSchema))

container.bind<Model<IVersionStatisticsDocument>>(DI.Models.VersionStatistics)
	.toConstantValue(createModel(VERSION_STATISTICS, VersionStatisticSchema))

container.bind<Model<IClientDocument>>(DI.Models.Client)
	.toConstantValue(createModel(CLIENT, ClientSchema))

container.bind<IPreRespondHook>(DI.Hooks.Auth)
	.to(AuthHook)
	.inSingletonScope()

container.bind<IPostRespondHook>(DI.Hooks.CreateClientsMediator)
	.to(CreateClientsMediatorHook)
	.inSingletonScope()

container.bind<IPostRespondHook>(DI.Hooks.Report)
	.to(ReportHook)
	.inSingletonScope()

container.bind<IPostRespondHook>(DI.Hooks.ReleaseUpdate)
	.to(ReleaseUpdateHook)
	.inSingletonScope()

container.bind<ClientsMediatorFactory>(DI.Factories.ClientsMediator)
	.toFactory(clientsMediatorFactory)

container.bind<ISocketMediator>(DI.Mediators.Admins)
	.toDynamicValue(adminMediatorFactory)
	.inSingletonScope()

container.bind<Map<string, ISocketMediator>>(DI.Mediators.Clients)
	.toConstantValue(new Map())

export default container

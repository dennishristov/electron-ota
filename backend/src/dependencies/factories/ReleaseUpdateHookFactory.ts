import { interfaces } from 'inversify'
import { ISocketMediator } from '../../util/mediator/Interfaces'
import ReleaseUpdateHook from '../../hooks/ReleaseUpdateHook'
import { Model } from 'mongoose'
import { IVersionDocument } from '../../models/Version'
import { IClientDocument } from '../../models/Client'

export type ReleaseUpdateHookFactory = (clientsMediator: ISocketMediator) => ReleaseUpdateHook

export default function releaseUpdateHookFactory({ container }: interfaces.Context): ReleaseUpdateHookFactory {
	const versions = container.get<Model<IVersionDocument>>(DI.Models.Version)
	const clients = container.get<Model<IClientDocument>>(DI.Models.Client)

	return (clientsMediator: ISocketMediator) => {
		return new ReleaseUpdateHook(clientsMediator, versions, clients)
	}
}
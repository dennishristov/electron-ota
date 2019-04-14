import ElectronUpdateServiceClient from 'electron-ota-client'

declare global {
	namespace NodeJS {
		// tslint:disable-next-line:interface-name
		interface Global {
			updateService: ElectronUpdateServiceClient,
			isDevMode: boolean,
		}
	}
}

global.isDevMode = false

global.updateService = new ElectronUpdateServiceClient({
	bundleId: 'test-electron',
	updateServerUrl: 'https://electron-ota-api.herokuapp.com',
	versionName: require('../package.json').version,
	checkForUpdateOnConnect: false,
})

if (global.isDevMode || !global.updateService.loadLatestUpdateSync()) {
	import('./main')
}

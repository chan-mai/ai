type Config = {
	host: string;
	serverName?: string;
	i: string;
	master?: string;
	wsUrl: string;
	apiUrl: string;
	keywordEnabled: boolean;
	reversiEnabled: boolean;
	notingEnabled: boolean;
	chartEnabled: boolean;
	serverMonitoring: boolean;
	checkEmojisEnabled?: boolean;
	checkEmojisAtOnce?: boolean;
	mecab?: string;
	mecabDic?: string;
	memoryDir?: string;
};

import config from '../config/config.json' assert { type: 'json' };

let conf = {
	wsUrl: config.host.replace('http', 'ws'),
	apiUrl: config.host + '/api',
	...config,
};

export default conf as Config;

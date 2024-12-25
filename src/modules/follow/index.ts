import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import Message from '@/message.js';
import config from '@/config.js';

export default class extends Module {
	public readonly name = 'follow';

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		// 除外インスタンス
		const followExcludeInstances = config.followExcludeInstances || [];

		if (msg.text && msg.includes(['フォロー', 'フォロバ', 'follow me'])) {
			const user: any = await this.ai!.api('users/show', {
				userId: msg.userId
			});
			if (!user.isFollowing && (msg.user.host == null || !this.isHostExcluded(msg.user.host, followExcludeInstances))) {
				try {
					this.ai?.api('following/create', {
						userId: msg.userId,
					});
					return {
						reaction: msg.friend.love >= 0 ? 'like' : null
					};
				} catch (error) {
					console.error('Failed to follow user:', error);
				}
			} else {
				// 傲慢な奴め
				if ( !msg.user.isFollowing ) {
					await msg.reply('どちらさまですか？');
				}
				return {
					reaction: msg.friend.love >= 0 ? 'hmm' : null
				};
			}
		} else {
			return false;
		}
	}

	private isHostExcluded(host: string,excludedHosts: string[]): boolean {
		for (const excludedHost of excludedHosts) {
				if (excludedHost.startsWith('*')) {
						const domain = excludedHost.slice(1);
						if (host.endsWith(domain)) {
								return true;
						}
				} else if (host === excludedHost) {
						return true;
				}
		}
		return false;
	}
}

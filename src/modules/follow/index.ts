import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import Message from '@/message.js';

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
		if (msg.text && msg.includes(['フォロー', 'フォロバ', 'follow me'])) {
			const user: any = await this.ai!.api('users/show', {
				userId: msg.userId
			});
			if (!user.isFollowing) {
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
}

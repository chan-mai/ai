import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import serifs from '@/serifs.js';
import Message from '@/message.js';
import config from '@/config.js';
import urlToBase64 from '@/utils/url2base64.js';
import got from 'got';
import { Note } from '@/misskey/note.js';

type AiChat = {
	question: string;
	prompt: string;
	api: string;
	key: string;
};
type Base64Image = {
	type: string;
	base64: string;
};
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export default class extends Module {
	public readonly name = 'aichat';

	@bindThis
	public install() {
		setInterval(this.replySTLNotes, 1000 * 60 * 30);
		return {
			mentionHook: this.mentionHook
		};
	}

	@bindThis
	private async genTextByGemini(aiChat: AiChat, image:Base64Image|null) {
		this.log('Generate Text By Gemini...');
		let parts: ({ text: string; inline_data?: undefined; } | { inline_data: { mime_type: string; data: string; }; text?: undefined; })[];
		if (image === null) {
			// 画像がない場合、メッセージのみで問い合わせ
			parts = [{text: aiChat.prompt + aiChat.question}];
		} else {
			// 画像が存在する場合、画像を添付して問い合わせ
			parts = [
				{ text: aiChat.prompt + aiChat.question },
				{
					inline_data: {
						mime_type: image.type,
						data: image.base64,
					},
				},
			];
		}
		let options: any = {
			url: aiChat.api,
			searchParams: {
				key: aiChat.key,
			},
			json: {
				contents: {parts: parts}
			},
		};
		this.log(JSON.stringify(options));
		let res_data:any = null;
		try {
			res_data = await got.post(options,
				{parseJson: res => JSON.parse(res)}).json();
			this.log(JSON.stringify(res_data));
			if (res_data.hasOwnProperty('candidates')) {
				if (res_data.candidates.length > 0) {
					if (res_data.candidates[0].hasOwnProperty('content')) {
						if (res_data.candidates[0].content.hasOwnProperty('parts')) {
							if (res_data.candidates[0].content.parts.length > 0) {
								if (res_data.candidates[0].content.parts[0].hasOwnProperty('text')) {
									return res_data.candidates[0].content.parts[0].text;
								}
							}
						}
					}
				}
			}
		} catch (err: unknown) {
			this.log('Error By Call Gemini');
			if (err instanceof Error) {
				this.log(`${err.name}\n${err.message}\n${err.stack}`);
			}
		}
		return null;
	}

	@bindThis
	private async note2base64Image(notesId: string) {
		const noteData: any = await this.ai!.api('notes/show', { noteId: notesId });
		let fileType: string | undefined,thumbnailUrl: string | undefined;
		if (noteData !== null && noteData.hasOwnProperty('files')) {
			if (noteData.files.length > 0) {
				if (noteData.files[0].hasOwnProperty('type')) {
					fileType = noteData.files[0].type;
				}
				if (noteData.files[0].hasOwnProperty('thumbnailUrl')) {
					thumbnailUrl = noteData.files[0].thumbnailUrl;
				}
			}
			if (fileType !== undefined && thumbnailUrl !== undefined) {
				try {
					const image = await urlToBase64(thumbnailUrl);
					const base64Image:Base64Image = {type: fileType, base64: image};
					return base64Image;
				} catch (err: unknown) {
					if (err instanceof Error) {
						this.log(`${err.name}\n${err.message}\n${err.stack}`);
					}
				}
			}
		}
		return null;
	}

	@bindThis
	private async replySTLNotes() {
		const tl = await this.ai?.api('notes/hybrid-timeline', {
			limit: 10
		}) as Note[];

		const interestedNotes = tl.filter(async note =>
			note.userId !== this.ai?.account.id &&
			note.text != null &&
			note.cw == null &&
			// 誰かへのリプライではない
			(await this.ai?.api('notes/show', { noteId: note.id }) as Note).replyId !== null &&
			// 重複回避のため、すでに何かしらのリプがついているノートは除外(0のみpass)
			(await this.ai?.api('notes/show', { noteId: note.id }) as Note).repliesCount === 0
		);
		
		// interestedNotesからランダムなノートを選択
		const rnd = Math.floor(Math.random() * interestedNotes.length);
		const note = interestedNotes[rnd];
		//const note = interestedNotes[0];

		let text:string, aiChat:AiChat;
		let prompt:string = '';
		if (config.prompt) {
			prompt = config.prompt;
			try {
				const userData: any = await this.ai?.api('users/show', { userId: note.userId });
				const name = userData?.name || userData?.username || '名無し';
				prompt = prompt.replace('{name}', name);
			} catch (err: unknown) {
					this.log('Failed to get user data for name replacement.');
			}
		}
		// APIキーないよないよ
		if (!config.geminiApiKey) return false;
		
		const base64Image:Base64Image|null = await this.note2base64Image(note.id);
		aiChat = {
			question: note.text!,
			prompt: prompt,
			api: GEMINI_API_ENDPOINT,
			key: config.geminiApiKey
		};

		text = await this.genTextByGemini(aiChat, base64Image);

		if (text == null) {
			this.log('The result is invalid. It seems that tokens and other items need to be reviewed.')
			return false;
		}

		this.log('Replying...');
		this.ai?.post({
			text: serifs.aichat.post(text),
			replyId: note.id
		});
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (
			msg.includes([this.name]) ||
			(
				(await this.ai?.api('notes/show', { noteId: msg.replyId }) as Note)?.userId === this.ai?.account.id &&
				(await this.ai?.api('notes/show', { noteId: msg.replyId }) as Note).text?.includes(this.name)
			)
		) {
			this.log('AiChat requested');

			const relation = await this.ai?.api('users/relation', { userId: msg.userId }) as any[];

			if (!relation?.[0]?.isFollowing && msg.user.host !== config.host) {
					this.log('The user is not following me:' + msg.userId);
					msg.reply('ごめんね…そういうのはもっと仲良くなってからかな…？？');
					return false;
			}
		} else {
			return false;
		}

		const question = msg.extractedText
			.replace(new RegExp(this.name, "i"), '')
			.trim();

		let text:string, aiChat:AiChat;
		let prompt:string = '';
		if (config.prompt) {
			prompt = config.prompt;
			try {
				const userData: any = await this.ai?.api('users/show', { userId: note.userId });
				const name = userData?.name || userData?.username || '名無し';
				prompt = prompt.replace('{name}', name);
			} catch (err: unknown) {
					this.log('Failed to get user data for name replacement.');
			}
		}
		// APIキーないよないよ
		if (!config.geminiApiKey) {
			msg.reply(serifs.aichat.nothing);
			return false;
		}
		const base64Image:Base64Image|null = await this.note2base64Image(msg.id);
		aiChat = {
			question: question,
			prompt: prompt,
			api: GEMINI_API_ENDPOINT,
			key: config.geminiApiKey
		};

		text = await this.genTextByGemini(aiChat, base64Image);

		if (text == null) {
			this.log('The result is invalid. It seems that tokens and other items need to be reviewed.')
			msg.reply(serifs.aichat.error);
			return false;
		}

		this.log('Replying...');
		msg.reply(serifs.aichat.post(text));

		return {
			reaction: 'like'
		};
	}
}

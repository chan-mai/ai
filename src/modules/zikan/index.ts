import Module from '@/module.js';
import { bindThis } from '@/decorators.js';
import accurateInterval from 'accurate-interval';

export default class extends Module {
	public readonly name = 'zikan';

	@bindThis
	public install() {
		accurateInterval(this.post, 1000 * 60 * 60, { aligned: true, immediate: true });

		return {};
	}

	@bindThis
	private async post() {
		const date = new Date();
		date.setMinutes(date.getMinutes() + 1);

		const hour = date.getHours();

		switch (hour) {
			default:
				break;

			case 7:
				this.ai!.post({
					text: `おはようございます！${hour}時です。今日も無理せず頑張ってください...！`
				});
				break;

			case 23:
				this.ai!.post({
					text: `${hour}時ですよ～！そろそろ寝る時間ですよ！`
				});
				break;

			case 2:
				this.ai!.post({
					text: `${hour}時です、夜更かしさんですか？藍は寝る必要がないので傍にいますよ。`
				});
				break;
		}
	}
}
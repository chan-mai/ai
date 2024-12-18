export type Note = {
	id: string;
	userId: string;
	cw: string | null;
	text: string | null;
	reply: any | null;
	reactionCount: number;
	renoteCount: number;
	repliesCount: number;
	poll?: {
		choices: {
			votes: number;
			text: string;
		}[];
		expiredAfter: number;
		multiple: boolean;
	} | null;
	replyId: string | null;
	renoteId: string | null;
};

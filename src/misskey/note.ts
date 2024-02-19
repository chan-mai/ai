export type Note = {
	id: string;
	userId: string;
	cw: string | null;
	text: string | null;
	reply: any | null;
	poll?: {
		choices: {
			votes: number;
			text: string;
		}[];
		expiredAfter: number;
		multiple: boolean;
	} | null;
};

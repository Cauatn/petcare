// corpo de erro montado pelo HttpExceptionFilter do backend (src/commons/filters)
export type ApiErrorBody<TDetails = unknown> = {
	statusCode: number;
	timeStamp: string;
	path: string;
	requestId?: string;
	message: string | { field: string; message: string }[];
	code?: string;
	details?: TDetails;
};

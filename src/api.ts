import axios from "axios";

interface IArgs {
    code: string;
    range?: string;
    interval?: string;
}

function getAPIUrl(args: IArgs) {
    const { code, range = "1mo", interval = "1d" } = args;
    const api = `https://query1.finance.yahoo.com/v8/finance/chart/${code}?range=${range}&region=US&lang=zh-CN&includePrePost=false&interval=${interval}&useYfid=true`;
    return api;
}

export interface IMeta {
    currency: string;
}

export interface IQuote {
    high: number[];
    volume: number[];
    open: number[];
    low: number[];
    close: number;
}

export interface IAdjclose {
    adjclose: number[];
}

export interface IIndicator {
    quote: IQuote;
    adjclose: IAdjclose[];
}

export interface IResult {
    meta: IMeta;
    timestamp: number[];
    indicators: IIndicator;
}

export interface ISuccessChart {
    result: IResult[];
    error: null;
}

export interface IError {
    code: string;
    description: string;
}

export interface IFailedChart {
    error: IError;
}

export type IChart = ISuccessChart | IFailedChart;

export interface IResponse {
    chart: IChart;
}

export async function getHistory(args: IArgs) {
    const url = getAPIUrl(args);
    const resp = await axios.get(url);
    return resp.data as IResponse;
}

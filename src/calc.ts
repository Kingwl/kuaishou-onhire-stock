import { getHistory } from "./api";
import * as moment from "moment";
import * as lodash from "lodash";

const code = "1024.HK";
const format = "YYYY-MM-DD HH:mm";

function first<T>(items: T[] | undefined): T {
    if (!items?.length) {
        throw new Error("Out of range");
    }

    return items[0];
}

function last<T>(items: T[] | undefined): T {
    if (!items?.length) {
        throw new Error("Out of range");
    }

    return items[items.length - 1];
}

interface IStockData {
    avg: string;
    from: string;
    to: string;
}

function getDataFromRange(
    values: (readonly [number, number])[],
    start: moment.Moment,
    end: moment.Moment
): IStockData {
    const daysInLast15Days = values.filter(([time]) => {
        const value = moment.unix(time);
        return start < value && value < end;
    });

    const sum = lodash.sumBy(daysInLast15Days, ([, value]) => value);
    const avg = (sum / daysInLast15Days.length).toFixed(2);
    const [from] = first(daysInLast15Days);
    const [to] = last(daysInLast15Days);

    const fromText = moment.unix(from).format(format);
    const toText = moment.unix(to).format(format);

    return { avg, from: fromText, to: toText };
}

export interface IResult {
    current: IStockData;
    next: IStockData;
    currency: string;
    now: string;
}

export async function fetchAndCalc(): Promise<IResult> {
    const history = await getHistory({ code });
    if (history.chart.error) {
        throw new Error(history.chart.error.description);
    }

    const stock = first(history.chart.result);
    const adjclose = first(stock.indicators.adjclose);
    const timeAndValues = lodash.zipWith(
        stock.timestamp,
        adjclose.adjclose,
        (a, b) => [a, b] as const
    );

    const today = moment().startOf("day");
    const tomorrow = today.clone().add(1, "day");
    const last15DaysToToday = today.clone().subtract(15, "days");
    const last15DaysToTomorrow = tomorrow.clone().subtract(15, "days");

    const current = getDataFromRange(timeAndValues, last15DaysToToday, today);
    const next = getDataFromRange(
        timeAndValues,
        last15DaysToTomorrow,
        tomorrow
    );

    const now = moment().format(format);

    return {
        current,
        next,
        currency: stock.meta.currency,
        now
    };
}

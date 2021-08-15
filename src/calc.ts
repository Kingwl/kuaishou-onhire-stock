import { getHistory } from "./api";
import * as moment from "moment";
import "moment-timezone";
import * as lodash from "lodash";

const code = "1024.HK";
const format = "YYYY-MM-DD HH:mm";
const dateFormat = "YYYY-MM-DD";
const timezone = "Asia/Shanghai";

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

function assertDef<T>(
    v: T | null | undefined,
    message: string
): asserts v is T {
    if (v === undefined || v === null) {
        throw new Error(message);
    }
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
    const date2ValueMap = new Map(
        values.map(([time, value]) => {
            const date = moment.unix(time).tz(timezone).format(dateFormat);
            return [date, value];
        })
    );

    const [startValueTime] = first(values);
    const [endValueTime] = last(values);
    const startValueMoment = moment.unix(startValueTime).tz(timezone);
    const endValueMoment = moment.unix(endValueTime).tz(timezone);
    const loopStart =
        start < startValueMoment ? start.clone() : startValueMoment;
    const loopEnd = end > endValueMoment ? end.clone() : endValueMoment;

    let lastValue: number | undefined;
    const natureDayValuesMap = new Map<string, number>();

    for (
        let cur = loopStart.clone().startOf("day");
        cur <= loopEnd.clone().startOf("day");
        cur.add(1, "day")
    ) {
        const date = cur.format(dateFormat);
        const value = date2ValueMap.get(date) ?? lastValue;
        lastValue = value;

        if (start <= cur && cur < end) {
            assertDef(value, "Must have value");
            natureDayValuesMap.set(date, value);
        }
    }

    const valuesInLast15Days = Array.from(natureDayValuesMap.values());
    const sum = lodash.sumBy(valuesInLast15Days);
    const avg = (sum / valuesInLast15Days.length).toFixed(2);

    const fromText = start.clone().format(format);
    const toText = end.clone().subtract(1, "second").format(format);
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

    const today = moment().tz(timezone).startOf("day");
    const tomorrow = today.clone().add(1, "day");
    const last15DaysToToday = today.clone().subtract(15, "days");
    const last15DaysToTomorrow = tomorrow.clone().subtract(15, "days");

    const current = getDataFromRange(timeAndValues, last15DaysToToday, today);
    const next = getDataFromRange(
        timeAndValues,
        last15DaysToTomorrow,
        tomorrow
    );

    const now = moment().tz(timezone).format(format);

    return {
        current,
        next,
        currency: stock.meta.currency,
        now
    };
}

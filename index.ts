import axios from "axios";

declare module RockStockList {
	export interface Allstock {
		tm: number;
		c: string;
		m: number;
		n: string;
		t: number;
		i: string;
	}

	export interface Data {
		tc: number;
		allstock: Allstock[];
	}

	export interface RootObject {
		rc: number;
		rt: number;
		svr: number;
		lt: number;
		full: number;
		data: Data;
	}
}
const page = async (num: number) =>
	axios.get<RockStockList.RootObject>(
		`https://push2ex.eastmoney.com/getAllStockChanges?type=8201&ut=7eea3edcaed734bea9cbfc24409ed989&pageindex=${num}&pagesize=500&dpt=wzchanges`
		// {
		// 	headers: { "Accept-Encoding": "gzip,deflate,compress" },
		// }
	);
const fetchRocketList = async (count: number = 0, pageNum: number = 0) => {
	// https://push2ex.eastmoney.com/getAllStockChanges?type=8201&ut=7eea3edcaed734bea9cbfc24409ed989&pageindex=0&pagesize=500&dpt=wzchanges
	// 因为 接口返回个数限制，最多一次请求500条，所以需要分页请求
	console.log("count", count, "pageNum", pageNum);
	const loadPage = await page(pageNum);
	let allstock = loadPage.data.data.allstock;
	if (loadPage.data.data.tc > allstock.length + count) {
		const NextPage = await fetchRocketList(
			allstock.length + count,
			pageNum + 1
		);
		allstock = allstock.concat(NextPage);
	}
	return allstock;
};

//https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=0.001219&fields=f2,f3,f4,f12
declare module StockList {
	export interface Diff {
		f2: number;
		f3: number;
		f4: number;
		f12: string;
		f100: string;
		f103: string;
	}

	export interface Data {
		total: number;
		diff: Diff[];
	}

	export interface RootObject {
		rc: number;
		rt: number;
		svr: number;
		lt: number;
		full: number;
		dlmkts: string;
		data: Data;
	}
}

fetchRocketList()
	.then((res) => res.reverse())
	.then((res) => {
		const map = new Map<string, boolean>();
		const filter = res.filter((item) => {
			if (map.has(item.c)) {
				return false;
			} else {
				map.set(item.c, true);
				return true;
			}
		});
		return filter;
	})
	.then(async (data) => {
		const codes = data.map((item) =>
			item.c.startsWith("6") ? "1." + item.c : "0." + item.c
		);
		const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${codes.join(
			","
		)}&fields=f2,f3,f4,f12,f100,f103`;
		const StockList = await axios.get<StockList.RootObject>(url);
		const recordMap = new Map<string, StockList.Diff>();
		StockList.data.data.diff.forEach((item) => {
			recordMap.set(item.f12, item);
		});
		let total = 0;
		const result = data.map((item) => ({
			name: item.n,
			code: item.c,
			time: item.tm,
			rate: Number(item.i.split(",")[2]) * 100,
			percent: recordMap.get(item.c)?.f3,
			hy: recordMap.get(item.c)?.f100,
			gn: recordMap.get(item.c)?.f103,
			diff:
				recordMap.get(item.c)!.f3 - Number(item.i.split(",")[2]) * 100,
		}));
		const sortResult = result.sort((a, b) => b.diff - a.diff);
		// data.forEach((item) => {
		// 	// if(item.tm > 101500) return
		// 	const rate = Number(item.i.split(",")[2]) * 100;
		// 	const record = recordMap.get(item.c);
		// 	if (record) {
		// 		const diff = record.f4;
		// 		const price = record.f2;
		// 		const percent = record.f3;
		// 		console.log(
		// 			`${item.n} ${item.c} 在 ${item.tm} 收益为 ${(
		// 				percent - rate
		// 			).toFixed(
		// 				2
		// 			)}% -  ${price} - ${percent}% 异动时涨幅：${rate}% `
		// 		);
		// 		total += percent - rate;

		// 		const it = document.createElement("div");
		// 		const a = document.createElement("a");
		// 		a.href = `https://quote.eastmoney.com/${
		// 			item.c.startsWith("6") ? `sh${item.c}` : `sz${item.c}`
		// 		}.html`;
		// 		a.innerHTML = `${item.n} ${item.c} 在 ${item.tm} 收益为 ${(
		// 			percent - rate
		// 		).toFixed(2)}% -  ${price} - ${percent}% 异动时涨幅：${rate}% `;
		// 		it.appendChild(a);
		// 		document.body.appendChild(it);
		// 	}
		// });
		sortResult.filter(item => item.gn?.includes("电池")).forEach((item) => {
			const it = document.createElement("div");
			const a = document.createElement("a");
			a.href = `https://quote.eastmoney.com/${
				item.code.startsWith("6") ? `sh${item.code}` : `sz${item.code}`
			}.html`;
			a.target = "_blank";
			a.innerHTML = `${item.name} ${item.code} 在 ${
				item.time
			} 收益为 ${item.diff.toFixed(2)}%  - ${
				item.percent
			}% 异动时涨幅：${item.rate.toFixed(2)}% 
                行业：${item.hy} 概念：${item.gn}`;
			it.appendChild(a);
			document.body.appendChild(it);
			total += item.diff;
			console.log(`${item.name} ${item.code} 在 ${
				item.time
			} 收益为 ${item.diff.toFixed(2)}%  - ${
				item.percent
			}% 异动时涨幅：${item.rate.toFixed(2)}%  
行业：${item.hy} 概念：${item.gn}`);
		});

		console.log("总收益", total, "%");
	});

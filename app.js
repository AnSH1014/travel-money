const DEFAULTS={rates:{CZK:60.61,EUR:1574.8,sourceDate:null,updatedAt:null},fees:{card:1.7,dcc:3},budget:1500000,history:[]};
const KEY="travelMoneyV2";
let state=loadState(), deferredPrompt=null;
let reverseCurrency="CZK",restaurantCurrency="CZK",tipChoice=10,compareCurrency="CZK";
const $=id=>document.getElementById(id);
function loadState(){try{return merge(DEFAULTS,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return structuredClone(DEFAULTS)}}
function merge(base,extra){return{...base,...extra,rates:{...base.rates,...(extra.rates||{})},fees:{...base.fees,...(extra.fees||{})},history:Array.isArray(extra.history)?extra.history:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function n(v){return Number(String(v??"").replace(/[^0-9.-]/g,""))||0}
function formatInputNumber(value){
 const raw=String(value??"").replace(/[^0-9]/g,"").replace(/^0+(?=\d)/,"");
 return raw?Number(raw).toLocaleString("ko-KR"):"0";
}
function syncKrwInputState(){
 const input=$("krwInput"),amount=n(input.value),empty=amount===0;
 input.classList.toggle("is-empty",empty);
 $("clearKrwInline").classList.toggle("hidden",empty);
 $("czkResult").classList.toggle("muted-result",empty);
 $("eurResult").classList.toggle("muted-result",empty);
}
function money(v,d=0){return new Intl.NumberFormat("ko-KR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(v)}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
function setActive(group,value){document.querySelectorAll(`#${group} button`).forEach(b=>b.classList.toggle("active",b.dataset.value===String(value)))}
function rate(c){return state.rates[c]}
function roundUp(v,unit){if(!unit||unit==="none")return v;return Math.ceil(v/Number(unit))*Number(unit)}
function syncSettings(){
 $("czkRateInput").value=state.rates.CZK;$("eurRateInput").value=state.rates.EUR;
 $("cardFeeInput").value=state.fees.card;$("dccFeeInput").value=state.fees.dcc;$("budgetInput").value=state.budget;
 $("rateStatus").textContent=state.rates.updatedAt?`최근 적용 ${state.rates.updatedAt}`:"저장 환율 사용 중";
 if($("rateStatusInline"))$("rateStatusInline").textContent=state.rates.updatedAt?`최근 적용 ${state.rates.updatedAt}`:"저장 환율 사용 중";
}
function calcExchange(){
 const input=$("krwInput"),krw=n(input.value);
 input.value=formatInputNumber(krw);
 $("czkResult").textContent=krw?`${money(krw/rate("CZK"),0)} CZK`:"0 CZK";
 $("eurResult").textContent=krw?`${money(krw/rate("EUR"),2)} EUR`:"0 EUR";
 $("czkRateText").textContent=`1 CZK = ${money(rate("CZK"),2)}원`;
 $("eurRateText").textContent=`1 EUR = ${money(rate("EUR"),2)}원`;
 $("reverseResult").textContent=`약 ${money(n($("foreignInput").value)*rate(reverseCurrency))}원`;
 syncKrwInputState();calcRestaurant();calcCompare();renderBudget();
}
function calcRestaurant(){
 const bill=n($("billInput").value),people=Math.max(1,n($("peopleInput").value));
 let tip=tipChoice==="custom"?n($("customTip").value):Number(tipChoice);
 if($("serviceIncluded").checked)tip=0;
 const tipAmount=bill*tip/100,total=roundUp(bill+tipAmount,$("roundingSelect").value),digits=restaurantCurrency==="EUR"?2:0;
 $("billBaseOut").textContent=`${money(bill,digits)} ${restaurantCurrency}`;
 $("tipOut").textContent=`${money(tipAmount,digits)} ${restaurantCurrency} (${tip}%)`;
 $("restaurantTotalOut").textContent=`${money(total,digits)} ${restaurantCurrency}`;
 $("perPersonOut").textContent=`${money(total/people,digits)} ${restaurantCurrency}`;
 $("restaurantKrwOut").textContent=`약 ${money(total*rate(restaurantCurrency))}원`;
 return{bill,tip,total,people,krw:Math.round(total*rate(restaurantCurrency)),currency:restaurantCurrency};
}
function calcCompare(){
 const amount=n($("compareAmount").value),base=amount*rate(compareCurrency),card=base*(1+state.fees.card/100),dcc=card*(1+state.fees.dcc/100),diff=card-base;
 $("cashResult").textContent=`${money(base)}원`;$("cardResult").textContent=`${money(card)}원`;
 $("cardFeeLabel").textContent=`수수료 ${state.fees.card}%`;
 $("compareDiff").textContent=`${money(Math.abs(diff))}원`;
 $("compareAdvice").textContent=diff>0?`단순 계산상 현금이 약 ${money(diff)}원 낮습니다. 실제 환전 비용과 카드 혜택은 별도로 확인하세요.`:"두 결제 방식의 예상 차이가 거의 없습니다.";
 $("localCurrencyPay").textContent=`${money(card)}원`;$("dccPay").textContent=`${money(dcc)}원`;$("dccDiff").textContent=`약 ${money(dcc-card)}원`;
}
function addHistory(item){state.history.unshift({id:Date.now(),date:new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}),...item});state.history=state.history.slice(0,30);save();renderBudget()}
function renderBudget(){
 const spent=state.history.filter(x=>x.countBudget!==false).reduce((s,x)=>s+n(x.krw),0),remaining=state.budget-spent,pct=state.budget?Math.min(100,Math.round(spent/state.budget*100)):0;
 $("budgetPercent").textContent=`${pct}%`;$("spentAmount").textContent=`${money(spent)}원`;$("remainingAmount").textContent=`${money(remaining)}원`;
 $("budgetRing").style.background=`conic-gradient(var(--blue) ${pct}%,#E7ECF3 ${pct}%)`;
 $("historyList").innerHTML=state.history.length?state.history.map(x=>`<div class="history-item"><div><strong>${escapeHtml(x.name)}</strong><small>${x.date}${x.detail?` · ${escapeHtml(x.detail)}`:""}</small></div><div class="history-amount"><b>${money(x.krw)}원</b><button data-delete="${x.id}">삭제</button></div></div>`).join(""):`<p class="empty">아직 저장된 기록이 없습니다.</p>`;
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{state.history=state.history.filter(x=>x.id!==Number(b.dataset.delete));save();renderBudget()});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function network(){
 const online=navigator.onLine;$("networkBar").classList.toggle("offline",!online);$("networkText").textContent=online?"온라인":"오프라인";$("updateRatesBtn").disabled=!online;
 if($("onlineBadge")){
   $("onlineBadge").textContent=online?"온라인":"오프라인";
   $("onlineBadge").classList.toggle("offline",!online);
 }
 if(!online)$("rateMessage").textContent="오프라인입니다. 마지막 저장 환율로 계산합니다.";
 else if(!$("rateMessage").textContent.includes("기준일"))$("rateMessage").textContent="버튼을 누를 때만 인터넷에 연결합니다.";
}
async function updateRates(){
 if(!navigator.onLine)return;
 const b=$("updateRatesBtn"),m=$("rateMessage");b.disabled=true;b.textContent="환율 확인 중…";
 try{
   const res=await fetch("https://api.frankfurter.dev/v1/latest?base=KRW&symbols=CZK,EUR",{cache:"no-store"});
   if(!res.ok)throw new Error();
   const d=await res.json();if(!d.rates?.CZK||!d.rates?.EUR)throw new Error();
   state.rates.CZK=1/d.rates.CZK;state.rates.EUR=1/d.rates.EUR;state.rates.sourceDate=d.date;
   state.rates.updatedAt=new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
   save();syncSettings();calcExchange();m.textContent=`기준일 ${d.date} 환율을 저장했습니다. 이제 오프라인에서도 사용됩니다.`;toast("최신 환율을 저장했습니다");
 }catch{m.textContent="환율을 불러오지 못했습니다. 기존 저장 환율은 유지됩니다.";toast("환율 업데이트 실패")}
 finally{b.textContent="최신 환율 적용";b.disabled=!navigator.onLine}
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${b.dataset.page}`));scrollTo(0,0)});
document.querySelectorAll("[data-add-krw]").forEach(b=>b.onclick=()=>{$("krwInput").value=n($("krwInput").value)+n(b.dataset.addKrw);calcExchange();$("krwInput").focus()});
$("clearKrw").onclick=()=>{$("krwInput").value="0";calcExchange();$("krwInput").focus()};$("clearKrwInline").onclick=()=>{$("krwInput").value="0";calcExchange();$("krwInput").focus()};
["krwInput","foreignInput","billInput","peopleInput","customTip","compareAmount"].forEach(id=>$(id).addEventListener("input",calcExchange));
$("reverseCurrency").onclick=e=>{if(!e.target.dataset.value)return;reverseCurrency=e.target.dataset.value;setActive("reverseCurrency",reverseCurrency);$("foreignUnit").textContent=reverseCurrency;calcExchange()};
$("restaurantCurrency").onclick=e=>{if(!e.target.dataset.value)return;restaurantCurrency=e.target.dataset.value;setActive("restaurantCurrency",restaurantCurrency);$("billUnit").textContent=restaurantCurrency;$("roundingSelect").value=restaurantCurrency==="CZK"?"10":"none";calcRestaurant()};
$("tipOptions").onclick=e=>{if(!e.target.dataset.value)return;tipChoice=e.target.dataset.value;setActive("tipOptions",tipChoice);$("customTipWrap").classList.toggle("hidden",tipChoice!=="custom");calcRestaurant()};
$("serviceIncluded").onchange=calcRestaurant;$("roundingSelect").onchange=calcRestaurant;
$("peopleMinus").onclick=()=>{$("peopleInput").value=Math.max(1,n($("peopleInput").value)-1);calcRestaurant()};$("peoplePlus").onclick=()=>{$("peopleInput").value=n($("peopleInput").value)+1;calcRestaurant()};
$("compareCurrency").onclick=e=>{if(!e.target.dataset.value)return;compareCurrency=e.target.dataset.value;setActive("compareCurrency",compareCurrency);$("compareUnit").textContent=compareCurrency;calcCompare()};
$("updateRatesBtn").onclick=updateRates;
$("saveRestaurantBtn").onclick=()=>{const r=calcRestaurant();addHistory({name:"식당",krw:r.krw,detail:`${money(r.total,r.currency==="EUR"?2:0)} ${r.currency} · ${r.people}명`});toast("식당 계산을 저장했습니다")};
$("saveBudgetBtn").onclick=()=>{state.budget=n($("budgetInput").value);save();renderBudget();toast("예산을 저장했습니다")};
$("addExpenseBtn").onclick=()=>{const name=$("expenseName").value.trim()||"기타 지출",krw=n($("expenseAmount").value);if(!krw)return toast("금액을 입력하세요");addHistory({name,krw});$("expenseName").value="";$("expenseAmount").value="";toast("지출을 저장했습니다")};
$("clearHistoryBtn").onclick=()=>{if(confirm("기록을 모두 삭제할까요?")){state.history=[];save();renderBudget()}};
$("saveRatesBtn").onclick=()=>{state.rates.CZK=Math.max(.01,n($("czkRateInput").value));state.rates.EUR=Math.max(.01,n($("eurRateInput").value));state.rates.updatedAt="수동 설정";save();syncSettings();calcExchange();toast("수동 환율을 저장했습니다")};
$("saveFeesBtn").onclick=()=>{state.fees.card=Math.max(0,n($("cardFeeInput").value));state.fees.dcc=Math.max(0,n($("dccFeeInput").value));save();calcCompare();toast("수수료를 저장했습니다")};
$("resetAllBtn").onclick=()=>{if(confirm("환율, 예산, 기록을 모두 초기화할까요?")){localStorage.removeItem(KEY);location.reload()}};
window.addEventListener("online",network);window.addEventListener("offline",network);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};
window.addEventListener("appinstalled",()=>toast("홈 화면에 설치했습니다"));
syncSettings();calcExchange();network();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));

$("krwInput").addEventListener("focus",e=>{if(n(e.target.value)===0)e.target.select()});
$("krwInput").addEventListener("blur",e=>{e.target.value=formatInputNumber(e.target.value);syncKrwInputState()});

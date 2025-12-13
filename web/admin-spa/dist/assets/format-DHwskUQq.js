function r(e){if(e==null)return"0";const t=Math.abs(e);return t>=1e9?(e/1e9).toFixed(2)+"B":t>=1e6?(e/1e6).toFixed(2)+"M":t>=1e3?(e/1e3).toFixed(1)+"K":e.toLocaleString()}export{r as f};

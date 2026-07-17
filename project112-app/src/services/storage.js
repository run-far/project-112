const KEY='stridehq.v1';
export function loadState(defaults){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults}}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(state))}
export function resetState(){localStorage.removeItem(KEY);location.reload()}

// ================================================================
// J3_Lang.js - VessieLang Nivel J3 (Intermediario) v3.0.0
// Estende B1: numeros normais + listas + dicts + importar + para-cada + tarefa
// API: executarJ3(codigo)
// ================================================================
(function (global) {
'use strict';
function tokJ3(codigo) {
  const tokens = []; let pos = 0; const len = codigo.length;
  let linha = 1, coluna = 1;
  const KW = new Set(['var','se','senao','enquanto','para','cada','em','funcao','retorne','escreva','verdadeiro','falso','e','ou','nao','importar','tarefa','nulo']);
  function adv(n){ for(let i=0;i<n;i++){ if(codigo[pos]==='\n'){linha++;coluna=1;} else coluna++; pos++; } }
  while (pos < len) {
    const ch = codigo[pos];
    if (ch===' '||ch==='\t'||ch==='\r'){ adv(1); continue; }
    if (ch==='\n'){ adv(1); continue; }
    if (ch==='/'&&codigo[pos+1]==='/'){ while(pos<len&&codigo[pos]!=='\n') adv(1); continue; }
    if (ch==='#'){ while(pos<len&&codigo[pos]!=='\n') adv(1); continue; }
    if (ch==='"'||ch==="'"){
      const q=ch; adv(1); let s='';
      while(pos<len&&codigo[pos]!==q){
        if(codigo[pos]==='\\'){ adv(1); if(pos<len){ const e=codigo[pos]; if(e==='n')s+='\n'; else if(e==='t')s+='\t'; else s+=e; adv(1);} }
        else { s+=codigo[pos]; adv(1); }
      }
      if(pos>=len) throw new Error('String nao fechada linha '+linha);
      adv(1); tokens.push({tipo:'STRING',valor:s,linha,coluna}); continue;
    }
    if (/[0-9]/.test(ch)) {
      const iniCol=coluna; let num='';
      if (ch==='0'&&(codigo[pos+1]==='x'||codigo[pos+1]==='X'||codigo[pos+1]==='b'||codigo[pos+1]==='B'||codigo[pos+1]==='o'||codigo[pos+1]==='O')) {
        num+=codigo[pos]; adv(1); num+=codigo[pos]; adv(1);
        while(pos<len&&/[0-9a-fA-F_]/.test(codigo[pos])){ const cc=codigo[pos]; if(cc!=='_')num+=cc; adv(1); }
        let v; const base=num[1].toLowerCase();
        if(base==='x') v=parseInt(num.slice(2),16); else if(base==='b') v=parseInt(num.slice(2),2); else v=parseInt(num.slice(2),8);
        tokens.push({tipo:'NUMERO',valor:v,linha,coluna:iniCol}); continue;
      }
      while(pos<len&&/[0-9_]/.test(codigo[pos])){ const dd=codigo[pos]; if(dd!=='_')num+=dd; adv(1); }
      if(pos<len&&codigo[pos]==='.'&&/[0-9]/.test(codigo[pos+1]||'')){ num+='.'; adv(1); while(pos<len&&/[0-9_]/.test(codigo[pos])){ const ee=codigo[pos]; if(ee!=='_')num+=ee; adv(1);} tokens.push({tipo:'NUMERO',valor:parseFloat(num),linha,coluna:iniCol}); }
      else tokens.push({tipo:'NUMERO',valor:parseInt(num,10),linha,coluna:iniCol});
      continue;
    }
    const dois=codigo.substr(pos,2);
    if(['==','!=','<=','>=','&&','||'].includes(dois)){ tokens.push({tipo:'OPERADOR',valor:dois,linha,coluna}); adv(2); continue; }
    if('+-*/%=<>!(){}[];,:.'.includes(ch)){
      let t='PONTUACAO'; if('+-*/%=<>!'.includes(ch))t='OPERADOR';
      tokens.push({tipo:t,valor:ch,linha,coluna}); adv(1); continue;
    }
    if(/[a-zA-Z_]/.test(ch)){
      let id=''; const c0=coluna;
      while(pos<len&&/[a-zA-Z0-9_]/.test(codigo[pos])){ id+=codigo[pos]; adv(1); }
      tokens.push({tipo:KW.has(id)?'PALAVRA_CHAVE':'IDENTIFICADOR',valor:id,linha,coluna:c0}); continue;
    }
    throw new Error("Caractere inesperado '"+ch+"' linha "+linha);
  }
  tokens.push({tipo:'FIM',valor:null,linha,coluna});
  return tokens;
}
class ParserJ3 {
  constructor(t){ this.t=t; this.pos=0; }
  peek(){ return this.t[this.pos]; } next(){ return this.t[this.pos++]; }
  match(t,v){ const k=this.peek(); if(k.tipo===t&&(v===undefined||k.valor===v)) return this.next(); return null; }
  expect(t,v){ const k=this.match(t,v); if(!k){ const a=this.peek(); throw new Error('Esperado '+(v||t)+' mas achou '+a.valor+' linha '+a.linha);} return k; }
  parseProgram(){ const c=[]; while(this.peek().tipo!=='FIM') c.push(this.parseComando()); return {tipo:'programa',comandos:c}; }
  parseComando(){
    const tok=this.peek();
    if(tok.tipo==='PALAVRA_CHAVE'){
      if(tok.valor==='var') return this.parseDeclVar();
      if(tok.valor==='se') return this.parseSe();
      if(tok.valor==='enquanto') return this.parseEnquanto();
      if(tok.valor==='para') return this.parsePara();
      if(tok.valor==='escreva') return this.parseEscreva();
      if(tok.valor==='retorne') return this.parseRetorne();
      if(tok.valor==='funcao') return this.parseFuncao();
      if(tok.valor==='importar'){ this.next(); const m=this.expect('STRING').valor; this.expect('PONTUACAO',';'); return {tipo:'importar',modulo:m}; }
      if(tok.valor==='tarefa'){ this.next(); const n=this.expect('STRING').valor; return {tipo:'tarefa',nome:n,corpo:this.parseBloco()}; }
    }
    if(tok.tipo==='IDENTIFICADOR'){
      const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='='){ const id=this.next().valor; this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'atribuicao',id,expr:e}; }
      if(nx&&nx.valor==='('){ const ch=this.parseChamada(); this.expect('PONTUACAO',';'); return {tipo:'chamada_comando',chamada:ch}; }
      const alvo=this.parseAlvo();
      if(this.peek().valor==='='){ this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'atribuicao_alvo',alvo,expr:e}; }
      throw new Error('Comando invalido linha '+tok.linha);
    }
    if(tok.tipo==='PONTUACAO'&&tok.valor==='{') return this.parseBloco();
    throw new Error("Comando inesperado '"+tok.valor+"' linha "+tok.linha);
  }
  parseAlvo(){
    let base={tipo:'variavel',valor:this.expect('IDENTIFICADOR').valor};
    while(true){
      if(this.peek().valor==='['){ this.next(); const idx=this.parseExpressao(); this.expect('PONTUACAO',']'); base={tipo:'index',base,idx}; }
      else if(this.peek().valor==='.'){ this.next(); base={tipo:'prop',base,prop:this.expect('IDENTIFICADOR').valor}; }
      else break;
    }
    return base;
  }
  parseBloco(){ this.expect('PONTUACAO','{'); const c=[]; while(!(this.peek().tipo==='PONTUACAO'&&this.peek().valor==='}')) c.push(this.parseComando()); this.expect('PONTUACAO','}'); return {tipo:'bloco',comandos:c}; }
  parseDeclVar(){ this.expect('PALAVRA_CHAVE','var'); const id=this.expect('IDENTIFICADOR').valor; let e=null; if(this.match('OPERADOR','=')) e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'decl_var',id,expr:e}; }
  parseSe(){ this.expect('PALAVRA_CHAVE','se'); this.expect('PONTUACAO','('); const cc=this.parseExpressao(); this.expect('PONTUACAO',')'); const bb=this.parseBloco(); let ss=null; if(this.peek().valor==='senao'){ this.next(); ss=this.parseBloco(); } return {tipo:'se',cond:cc,corpo:bb,senao:ss}; }
  parseEnquanto(){ this.expect('PALAVRA_CHAVE','enquanto'); this.expect('PONTUACAO','('); const cc2=this.parseExpressao(); this.expect('PONTUACAO',')'); return {tipo:'enquanto',cond:cc2,corpo:this.parseBloco()}; }
  parsePara(){ this.expect('PALAVRA_CHAVE','para');
    if(this.peek().valor==='cada'){ this.next(); this.expect('PONTUACAO','(');
      const v=this.expect('IDENTIFICADOR').valor; this.expect('PALAVRA_CHAVE','em');
      const it=this.parseExpressao(); this.expect('PONTUACAO',')');
      return {tipo:'para_cada',variavel:v,iter:it,corpo:this.parseBloco()}; }
    this.expect('PONTUACAO','('); let init=null; const ti=this.peek();
    if(ti.valor==='var'){ this.next(); const id=this.expect('IDENTIFICADOR').valor;
      let e=null; if(this.match('OPERADOR','=')) e=this.parseExpressao();
      init={tipo:'decl_var',id,expr:e}; }
    else if(ti.tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='='){ const id=this.next().valor; this.next();
        init={tipo:'atribuicao',id,expr:this.parseExpressao()}; } }
    this.expect('PONTUACAO',';'); const cond=this.parseExpressao();
    this.expect('PONTUACAO',';'); let inc=null;
    if(this.peek().tipo==='IDENTIFICADOR'){ const nx2=this.t[this.pos+1];
      if(nx2&&nx2.valor==='='){ const id=this.next().valor; this.next();
        inc={tipo:'atribuicao',id,expr:this.parseExpressao()}; } }
    this.expect('PONTUACAO',')');
    return {tipo:'para',init,cond,inc,corpo:this.parseBloco()}; }
  parseEscreva(){ this.expect('PALAVRA_CHAVE','escreva');
    this.expect('PONTUACAO','('); const e=this.parseExpressao();
    this.expect('PONTUACAO',')'); this.expect('PONTUACAO',';');
    return {tipo:'escreva',expr:e}; }
  parseRetorne(){ this.expect('PALAVRA_CHAVE','retorne');
    const e=this.parseExpressao(); this.expect('PONTUACAO',';');
    return {tipo:'retorne',expr:e}; }
  parseFuncao(){ this.expect('PALAVRA_CHAVE','funcao');
    const id=this.expect('IDENTIFICADOR').valor;
    this.expect('PONTUACAO','('); const p=[];
    if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }
      while(this.match('PONTUACAO',',')); }
    this.expect('PONTUACAO',')'); return {tipo:'funcao',id,params:p,corpo:this.parseBloco()}; }
  parseChamada(){ const id=this.expect('IDENTIFICADOR').valor;
    this.expect('PONTUACAO','('); const a=[];
    if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }
      while(this.match('PONTUACAO',',')); }
    this.expect('PONTUACAO',')'); return {tipo:'chamada',id,args:a}; }
  parseExpressao(){ return this.parseOu(); }
  parseOu(){ let e=this.parseE();
    while(this.match('OPERADOR','||')) e={tipo:'binop',op:'||',esq:e,dir:this.parseE()};
    return e; }
  parseE(){ let e=this.parseComp();
    while(this.match('OPERADOR','&&')) e={tipo:'binop',op:'&&',esq:e,dir:this.parseComp()};
    return e; }
  parseComp(){ let e=this.parseAd(); const ops=['==','!=','<','>','<=','>='];
    while(true){ const t=this.peek();
      if(t.tipo==='OPERADOR'&&ops.includes(t.valor)){ const op=this.next().valor;
        e={tipo:'binop',op,esq:e,dir:this.parseAd()}; } else break; }
    return e; }
  parseAd(){ let e=this.parseMul(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='+'||t.valor==='-')){ const op=this.next().valor;
      e={tipo:'binop',op,esq:e,dir:this.parseMul()}; } else break; }
    return e; }
  parseMul(){ let e=this.parseUn(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='*'||t.valor==='/'||t.valor==='%')){ const op=this.next().valor;
      e={tipo:'binop',op,esq:e,dir:this.parseUn()}; } else break; }
    return e; }
  parseUn(){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='!'||t.valor==='-')){ const op=this.next().valor;
      return {tipo:'unario',op,expr:this.parseUn()}; }
    return this.parsePrim(); }
  parsePrim(){
    const t=this.peek();
    if(t.tipo==='NUMERO'||t.tipo==='STRING'){ this.next();
      return {tipo:t.tipo.toLowerCase(),valor:t.valor}; }
    if(t.valor==='verdadeiro'){ this.next(); return {tipo:'booleano',valor:true}; }
    if(t.valor==='falso'){ this.next(); return {tipo:'booleano',valor:false}; }
    if(t.valor==='nulo'){ this.next(); return {tipo:'nulo',valor:null}; }
    if(t.valor==='['){ this.next(); const els=[];
      if(this.peek().valor!==']'){ do{ els.push(this.parseExpressao()); }
        while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',']'); let node={tipo:'lista',elementos:els};
      while(this.peek().valor==='['){ this.next();
        const ix=this.parseExpressao(); this.expect('PONTUACAO',']');
        node={tipo:'index',base:node,idx:ix}; }
      return node; }
    if(t.valor==='{'){ this.next(); const pares=[];
      if(this.peek().valor!=='}'){ do{ const k=this.peek(); let chave=null;
        if(k.tipo==='STRING'||k.tipo==='IDENTIFICADOR'){ chave=k.valor; this.next(); }
        else throw new Error('Chave invalida linha '+k.linha);
        this.expect('PONTUACAO',':'); pares.push([chave,this.parseExpressao()]); }
        while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO','}'); return {tipo:'dicionario',pares}; }
    if(t.tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='('){ let node=this.parseChamada();
        while(true){ if(this.peek().valor==='['){ this.next();
          const ix=this.parseExpressao(); this.expect('PONTUACAO',']');
          node={tipo:'index',base:node,idx:ix}; }
          else if(this.peek().valor==='.'){ this.next();
            node={tipo:'prop',base:node,prop:this.expect('IDENTIFICADOR').valor}; }
          else break; }
        return node; }
      this.next(); let node={tipo:'variavel',valor:t.valor};
      while(true){ if(this.peek().valor==='['){ this.next();
        const ix=this.parseExpressao(); this.expect('PONTUACAO',']');
        node={tipo:'index',base:node,idx:ix}; }
        else if(this.peek().valor==='.'){ this.next();
          node={tipo:'prop',base:node,prop:this.expect('IDENTIFICADOR').valor}; }
        else break; }
      return node; }
    if(t.valor==='('){ this.next(); const e=this.parseExpressao();
      this.expect('PONTUACAO',')'); return e; }
    throw new Error('Expressao inesperada '+t.valor+' linha '+t.linha);
  }
}
class InterpJ3 {
  constructor(){ this.vars={}; this.funcs={}; this.out=[]; this.ret=null; }
  executar(ast){ for(const c of ast.comandos) this.exec(c); return this.out.join('\n'); }
  exec(c){
    if(c.tipo==='decl_var'){ this.vars[c.id]=c.expr?this.av(c.expr):undefined; return; }
    if(c.tipo==='atribuicao'){ if(!(c.id in this.vars)) throw new Error("Variavel '"+c.id+"' nao declarada");
      this.vars[c.id]=this.av(c.expr); return; }
    if(c.tipo==='atribuicao_alvo'){ this.setAlvo(c.alvo,this.av(c.expr)); return; }
    if(c.tipo==='se'){ if(this.truth(this.av(c.cond))) this.bloco(c.corpo);
      else if(c.senao) this.bloco(c.senao); return; }
    if(c.tipo==='enquanto'){ while(this.truth(this.av(c.cond))){
      this.bloco(c.corpo); if(this.ret!==null)break; } return; }
    if(c.tipo==='para'){ if(c.init){ if(c.init.tipo==='decl_var')
      this.vars[c.init.id]=c.init.expr?this.av(c.init.expr):undefined;
      else this.exec(c.init); }
      while(this.truth(this.av(c.cond))){ this.bloco(c.corpo);
        if(this.ret!==null)break; if(c.inc) this.exec(c.inc); } return; }
    if(c.tipo==='para_cada'){ const it=this.av(c.iter);
      const arr=Array.isArray(it)?it:Object.values(it||{});
      for(const v of arr){ this.vars[c.variavel]=v; this.bloco(c.corpo);
        if(this.ret!==null)break; } return; }
    if(c.tipo==='escreva'){ this.out.push(String(this.av(c.expr))); return; }
    if(c.tipo==='retorne'){ this.ret=this.av(c.expr); return; }
    if(c.tipo==='funcao'){ this.funcs[c.id]={params:c.params,corpo:c.corpo}; return; }
    if(c.tipo==='chamada_comando'){ this.av(c.chamada); return; }
    if(c.tipo==='bloco'){ this.bloco(c); return; }
    if(c.tipo==='importar'){ this.out.push('[J3] modulo "'+c.modulo+'" carregado'); return; }
    if(c.tipo==='tarefa'){ this.bloco(c.corpo);
      this.out.push("[J3] tarefa '"+c.nome+"' enfileirada (segundo plano)"); return; }
    throw new Error('Comando '+c.tipo);
  }
  bloco(b){ for(const x of b.comandos){ this.exec(x); if(this.ret!==null)break; } }
  setAlvo(a,v){ if(a.tipo==='variavel'){ if(!(a.valor in this.vars))
    throw new Error("Variavel '"+a.valor+"' nao declarada");
    this.vars[a.valor]=v; return; }
    const base=this.av(a.base);
    if(a.tipo==='index'){ base[this.av(a.idx)]=v; return; }
    base[a.prop]=v; }
  av(e){
    if(!e) return undefined;
    if(e.tipo==='numero'||e.tipo==='string'||e.tipo==='booleano') return e.valor;
    if(e.tipo==='nulo') return null;
    if(e.tipo==='lista') return e.elementos.map(x=>this.av(x));
    if(e.tipo==='dicionario'){ const o={};
      for(const kv of e.pares) o[kv[0]]=this.av(kv[1]); return o; }
    if(e.tipo==='variavel'){ if(e.valor in this.vars) return this.vars[e.valor];
      throw new Error("Variavel '"+e.valor+"' nao definida"); }
    if(e.tipo==='index') return this.av(e.base)[this.av(e.idx)];
    if(e.tipo==='prop') return this.av(e.base)[e.prop];
    if(e.tipo==='unario'){ const v=this.av(e.expr);
      return e.op==='-'?-v:!this.truth(v); }
    if(e.tipo==='binop'){ const a=this.av(e.esq), b=this.av(e.dir);
      if(e.op==='+')return a+b; if(e.op==='-')return a-b;
      if(e.op==='*')return a*b; if(e.op==='/')return a/b; if(e.op==='%')return a%b;
      if(e.op==='==')return a===b; if(e.op==='!=')return a!==b;
      if(e.op==='<')return a<b; if(e.op==='>')return a>b;
      if(e.op==='<=')return a<=b; if(e.op==='>=')return a>=b;
      if(e.op==='&&')return a&&b; if(e.op==='||')return a||b;
      throw new Error('op '+e.op); }
    if(e.tipo==='chamada') return this.call(e);
    throw new Error('Expressao '+e.tipo);
  }
  call(c){
    const args=c.args.map(a=>this.av(a));
    if(c.id==='tamanho') return args[0].length;
    if(c.id==='empurrar'){ args[0].push(args[1]); return args[0]; }
    if(c.id==='texto_maiusculo') return String(args[0]).toUpperCase();
    if(c.id==='texto_minusculo') return String(args[0]).toLowerCase();
    if(c.id==='tipo'){ const x=args[0];
      return Array.isArray(x)?'lista':(x===null?'nulo':typeof x); }
    if(!(c.id in this.funcs)) throw new Error("Funcao '"+c.id+"' nao definida");
    const f=this.funcs[c.id]; const pv=this.vars; const pr=this.ret;
    const sc={}; for(const k in pv) sc[k]=pv[k];
    for(let i=0;i<f.params.length;i++) sc[f.params[i]]=args[i];
    this.vars=sc; this.ret=null;
    try{ this.bloco(f.corpo); } finally{
      const r=this.ret!==null?this.ret:undefined;
      this.vars=pv; this.ret=pr; return r; }
  }
  truth(v){ if(typeof v==='boolean')return v; if(typeof v==='number')return v!==0;
    if(typeof v==='string')return v.length>0;
    if(v===null||v===undefined)return false; return true; }
}
function executarJ3(codigo){
  try{ const t=tokJ3(codigo); const p=new ParserJ3(t);
    return new InterpJ3().executar(p.parseProgram()); }
  catch(e){ return 'ERRO[J3]: '+e.message; }
}
global.executarJ3=executarJ3; global.J3_Lang={executar:executarJ3,versao:'3.0.0'};
if(typeof module!=='undefined'&&module.exports) module.exports={executarJ3};
})(typeof window!=='undefined'?window:globalThis);


























  // fim J3 - sem duplicatas
  // fim J3
  // fim


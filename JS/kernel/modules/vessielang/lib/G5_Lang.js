// ================================================================
// G5_Lang.js - VessieLang Nivel G5 (Sistema Operacional) v5.0.0
// Foco: desenvolver SO web: boot, processo, janela, arquivo,
// driver, syscall, permissao, rede, segundo plano.
// Numeros normais: 42, -7, 3.14, 1_000_000, 0xFF, 0b1010, 0o17
// API: executarG5(codigo, opcoes)
// ================================================================
(function (global) {
'use strict';
function tokG5(codigo) {
  const tokens=[]; let pos=0; const len=codigo.length;
  let linha=1, coluna=1;
  const KW=new Set(['var','se','senao','enquanto','para','cada','em','funcao','retorne','escreva','verdadeiro','falso','nulo','importar','tarefa','sistema','processo','janela','arquivo','driver','permissao','boot','desligar','syscall','rede']);
  function adv(n){ for(let i=0;i<n;i++){ if(codigo[pos]==='\n'){linha++;coluna=1;} else coluna++; pos++; } }
  while(pos<len){
    const ch=codigo[pos];
    if(ch===' '||ch==='\t'||ch==='\r'){ adv(1); continue; }
    if(ch==='\n'){ adv(1); continue; }
    if(ch==='/'&&codigo[pos+1]==='/'){ while(pos<len&&codigo[pos]!=='\n') adv(1); continue; }
    if(ch==='#'){ while(pos<len&&codigo[pos]!=='\n') adv(1); continue; }
    if(ch==='"'||ch==="'"){ const q=ch; adv(1); let s='';
      while(pos<len&&codigo[pos]!==q){
        if(codigo[pos]==='\\'){ adv(1); if(pos<len){ const e=codigo[pos];
          if(e==='n')s+='\n'; else if(e==='t')s+='\t'; else s+=e; adv(1); } }
        else { s+=codigo[pos]; adv(1); } }
      if(pos>=len) throw new Error('String nao fechada linha '+linha);
      adv(1); tokens.push({tipo:'STRING',valor:s,linha,coluna}); continue; }
    if(/[0-9]/.test(ch)){ const ic=coluna; let num='';
      if(ch==='0'&&(codigo[pos+1]==='x'||codigo[pos+1]==='X'||codigo[pos+1]==='b'||codigo[pos+1]==='B'||codigo[pos+1]==='o'||codigo[pos+1]==='O')){
        num+=codigo[pos]; adv(1); num+=codigo[pos]; adv(1);
        while(pos<len&&/[0-9a-fA-F_]/.test(codigo[pos])){ const cc2=codigo[pos]; if(cc2!=='_')num+=cc2; adv(1); }
        let v; const b=num[1].toLowerCase();
        if(b==='x')v=parseInt(num.slice(2),16); else if(b==='b')v=parseInt(num.slice(2),2); else v=parseInt(num.slice(2),8);
        tokens.push({tipo:'NUMERO',valor:v,linha,coluna:ic}); continue; }
      while(pos<len&&/[0-9_]/.test(codigo[pos])){ const dd2=codigo[pos]; if(dd2!=='_')num+=dd2; adv(1); }
      if(pos<len&&codigo[pos]==='.'&&/[0-9]/.test(codigo[pos+1]||'')){ num+='.'; adv(1);
        while(pos<len&&/[0-9_]/.test(codigo[pos])){ const ee2=codigo[pos]; if(ee2!=='_')num+=ee2; adv(1); }
        tokens.push({tipo:'NUMERO',valor:parseFloat(num),linha,coluna:ic}); }
      else tokens.push({tipo:'NUMERO',valor:parseInt(num,10),linha,coluna:ic});
      continue; }
    const dois=codigo.substr(pos,2);
    if(['==','!=','<=','>=','&&','||'].includes(dois)){ tokens.push({tipo:'OPERADOR',valor:dois,linha,coluna}); adv(2); continue; }
    if('+-*/%=<>!(){}[];,:.'.includes(ch)){ let t='PONTUACAO';
      if('+-*/%=<>!'.includes(ch))t='OPERADOR';
      tokens.push({tipo:t,valor:ch,linha,coluna}); adv(1); continue; }
    if(/[a-zA-Z_]/.test(ch)){ let id=''; const c0=coluna;
      while(pos<len&&/[a-zA-Z0-9_]/.test(codigo[pos])){ id+=codigo[pos]; adv(1); }
      tokens.push({tipo:KW.has(id)?'PALAVRA_CHAVE':'IDENTIFICADOR',valor:id,linha,coluna:c0}); continue; }
    throw new Error("Caractere '"+ch+"' linha "+linha);
  }
  tokens.push({tipo:'FIM',valor:null,linha,coluna});
  return tokens;
}
class ParserG5 {
  constructor(t){ this.t=t; this.pos=0; }
  peek(){ return this.t[this.pos]; } next(){ return this.t[this.pos++]; }
  match(t,v){ const k=this.peek();
    if(k.tipo===t&&(v===undefined||k.valor===v)) return this.next(); return null; }
  expect(t,v){ const k=this.match(t,v);
    if(!k){ const a=this.peek();
      throw new Error('Esperado '+(v||t)+' achou '+a.valor+' linha '+a.linha); }
    return k; }
  parseProgram(){ const c=[];
    while(this.peek().tipo!=='FIM') c.push(this.parseComando());
    return {tipo:'programa',comandos:c}; }
  parseComando(){
    const tok=this.peek();
    if(tok.tipo==='PALAVRA_CHAVE'){
      if(tok.valor==='var'){ this.next();
        const id=this.expect('IDENTIFICADOR').valor; let e=null;
        if(this.match('OPERADOR','=')) e=this.parseExpressao();
        this.expect('PONTUACAO',';'); return {tipo:'decl_var',id,expr:e}; }
      if(tok.valor==='escreva'){ this.next(); this.expect('PONTUACAO','(');
        const e=this.parseExpressao(); this.expect('PONTUACAO',')');
        this.expect('PONTUACAO',';'); return {tipo:'escreva',expr:e}; }
      if(tok.valor==='retorne'){ this.next(); const e=this.parseExpressao();
        this.expect('PONTUACAO',';'); return {tipo:'retorne',expr:e}; }
      if(tok.valor==='se'){ this.next(); this.expect('PONTUACAO','(');
        const c=this.parseExpressao(); this.expect('PONTUACAO',')');
        const b=this.parseBloco(); let s=null;
        if(this.peek().valor==='senao'){ this.next(); s=this.parseBloco(); }
        return {tipo:'se',cond:c,corpo:b,senao:s}; }
      if(tok.valor==='enquanto'){ this.next(); this.expect('PONTUACAO','(');
        const c=this.parseExpressao(); this.expect('PONTUACAO',')');
        return {tipo:'enquanto',cond:c,corpo:this.parseBloco()}; }
      if(tok.valor==='sistema'||tok.valor==='processo'||tok.valor==='janela'||tok.valor==='arquivo'||tok.valor==='driver'||tok.valor==='permissao'||tok.valor==='boot'||tok.valor==='desligar'||tok.valor==='syscall'||tok.valor==='rede'||tok.valor==='tarefa'||tok.valor==='importar'||tok.valor==='funcao'||tok.valor==='para')
        return this.parseComandoSO();
    }
    if(tok.tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='='){ const id=this.next().valor; this.next();
        const e=this.parseExpressao(); this.expect('PONTUACAO',';');
        return {tipo:'atribuicao',id,expr:e}; }
      if(nx&&nx.valor==='('){ const ch=this.parseChamada();
        this.expect('PONTUACAO',';');
        return {tipo:'chamada_comando',chamada:ch}; }
      const alvo=this.parseAlvo();
      if(this.peek().valor==='='){ this.next(); const e=this.parseExpressao();
        this.expect('PONTUACAO',';');
        return {tipo:'atribuicao_alvo',alvo,expr:e}; }
      throw new Error('Comando invalido linha '+tok.linha); }
    if(tok.valor==='{') return this.parseBloco();
    throw new Error("Comando '"+tok.valor+"' linha "+tok.linha);
  }
  parseAlvo(){ let base={tipo:'variavel',valor:this.expect('IDENTIFICADOR').valor};
    while(true){ if(this.peek().valor==='['){ this.next();
      const ix=this.parseExpressao(); this.expect('PONTUACAO',']');
      base={tipo:'index',base,idx:ix}; }
      else if(this.peek().valor==='.'){ this.next();
        base={tipo:'prop',base,prop:this.expect('IDENTIFICADOR').valor}; }
      else break; }
    return base; }
  parseBloco(){ this.expect('PONTUACAO','{'); const c=[];
    while(this.peek().valor!=='}') c.push(this.parseComando());
    this.expect('PONTUACAO','}'); return {tipo:'bloco',comandos:c}; }
  parseComandoSO(){
    const k=this.next().valor;
    if(k==='funcao'){ const id=this.expect('IDENTIFICADOR').valor;
      this.expect('PONTUACAO','('); const p=[];
      if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }
        while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',')'); return {tipo:'funcao',id,params:p,corpo:this.parseBloco()}; }
    if(k==='para'){ if(this.peek().valor==='cada'){ this.next();
      this.expect('PONTUACAO','('); const v=this.expect('IDENTIFICADOR').valor;
      this.expect('PALAVRA_CHAVE','em'); const it=this.parseExpressao();
      this.expect('PONTUACAO',')'); return {tipo:'para_cada',variavel:v,iter:it,corpo:this.parseBloco()}; }
      this.expect('PONTUACAO','('); let init=null; const ti=this.peek();
      if(ti.valor==='var'){ this.next(); const id=this.expect('IDENTIFICADOR').valor;
        let e=null; if(this.match('OPERADOR','=')) e=this.parseExpressao();
        init={tipo:'decl_var',id,expr:e}; }
      this.expect('PONTUACAO',';'); const cond=this.parseExpressao();
      this.expect('PONTUACAO',';'); let inc=null;
      if(this.peek().tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
        if(nx&&nx.valor==='='){ const id=this.next().valor; this.next();
          inc={tipo:'atribuicao',id,expr:this.parseExpressao()}; } }
      this.expect('PONTUACAO',')'); return {tipo:'para',init,cond,inc,corpo:this.parseBloco()}; }
    if(k==='importar'){ const m=this.expect('STRING').valor;
      this.expect('PONTUACAO',';'); return {tipo:'importar',modulo:m}; }
    if(k==='tarefa'){ const n=this.expect('STRING').valor;
      return {tipo:'tarefa',nome:n,corpo:this.parseBloco()}; }
    if(k==='boot'){ this.expect('PONTUACAO',';');
      return {tipo:'so',acao:'boot'}; }
    if(k==='desligar'){ this.expect('PONTUACAO',';');
      return {tipo:'so',acao:'desligar'}; }
    if(k==='sistema'){ const sub=this.expect('IDENTIFICADOR').valor;
      this.expect('PONTUACAO','('); const a=this.parseListaArgs();
      this.expect('PONTUACAO',')'); this.expect('PONTUACAO',';');
      return {tipo:'so',acao:'sistema.'+sub,args:a}; }
    if(k==='processo'||k==='janela'||k==='arquivo'||k==='driver'||k==='permissao'||k==='syscall'||k==='rede'){
      const sub=this.expect('IDENTIFICADOR').valor;
      this.expect('PONTUACAO','('); const a=this.parseListaArgs();
      this.expect('PONTUACAO',')'); this.expect('PONTUACAO',';');
      return {tipo:'so',acao:k+'.'+sub,args:a}; }
    throw new Error('Comando SO '+k);
  }
  parseListaArgs(){ const a=[];
    if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }
      while(this.match('PONTUACAO',',')); }
    return a; }
  parseChamada(){ const id=this.expect('IDENTIFICADOR').valor;
    this.expect('PONTUACAO','('); const a=this.parseListaArgs();
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
      if(t.tipo==='OPERADOR'&&ops.includes(t.valor))
        e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseAd()};
      else break; }
    return e; }
  parseAd(){ let e=this.parseMul(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='+'||t.valor==='-'))
      e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseMul()};
    else break; }
    return e; }
  parseMul(){ let e=this.parseUn(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='*'||t.valor==='/'||t.valor==='%'))
      e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseUn()};
    else break; }
    return e; }
  parseUn(){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='!'||t.valor==='-'))
      return {tipo:'unario',op:this.next().valor,expr:this.parseUn()};
    return this.parsePrim(); }
  parsePrim(){ const t=this.peek();
    if(t.tipo==='NUMERO'||t.tipo==='STRING'){ this.next();
      return {tipo:t.tipo.toLowerCase(),valor:t.valor}; }
    if(t.valor==='verdadeiro'){ this.next(); return {tipo:'booleano',valor:true}; }
    if(t.valor==='falso'){ this.next(); return {tipo:'booleano',valor:false}; }
    if(t.valor==='nulo'){ this.next(); return {tipo:'nulo',valor:null}; }
    if(t.valor==='['){ this.next(); const els=[];
      if(this.peek().valor!==']'){ do{ els.push(this.parseExpressao()); }
        while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',']'); return {tipo:'lista',elementos:els}; }
    if(t.valor==='{'){ this.next(); const pares=[];
      if(this.peek().valor!=='}'){ do{ const k=this.peek(); let chave=null;
        if(k.tipo==='STRING'||k.tipo==='IDENTIFICADOR'){ chave=k.valor; this.next(); }
        else throw new Error('Chave invalida '+k.linha);
        this.expect('PONTUACAO',':'); pares.push([chave,this.parseExpressao()]); }
        while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO','}'); let node={tipo:'dicionario',pares};
      node=this.parseSufixo(node); return node; }
    if(t.tipo==='PALAVRA_CHAVE'){ const so=['processo','janela','arquivo','driver','permissao','syscall','rede','sistema'];
      if(so.includes(t.valor)){ const kk=this.next().valor;
        const sub=this.expect('IDENTIFICADOR').valor;
        this.expect('PONTUACAO','('); const aa=this.parseListaArgs();
        this.expect('PONTUACAO',')'); let node={tipo:'so_expr',acao:kk+'.'+sub,args:aa};
        node=this.parseSufixo(node); return node; } }
    if(t.tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='('){ let node=this.parseChamada();
        node=this.parseSufixo(node); return node; }
      this.next(); let node={tipo:'variavel',valor:t.valor};
      node=this.parseSufixo(node); return node; }
    if(t.valor==='('){ this.next(); const e=this.parseExpressao();
      this.expect('PONTUACAO',')'); return this.parseSufixo(e); }
    throw new Error('Expressao '+t.valor+' linha '+t.linha);
  }
  parseSufixo(node){
    while(true){ if(this.peek().valor==='['){ this.next();
      const ix=this.parseExpressao(); this.expect('PONTUACAO',']');
      node={tipo:'index',base:node,idx:ix}; }
      else if(this.peek().valor==='.'){ this.next();
        node={tipo:'prop',base:node,prop:this.expect('IDENTIFICADOR').valor}; }
      else break; }
    return node; }
}
class InterpG5 {
  constructor(){ this.reset(); }
  reset(){ this.vars={}; this.funcs={}; this.out=[];
    this.ret=null; this.pidSeq=1000;
    this.proc={}; this.janelas={}; this.fs={}; this.drivers={}; this.rede={online:false}; }
  executar(ast){ for(const c of ast.comandos){ this.exec(c);
    if(this.ret!==null) this.ret=null; } return this.out.join('\n'); }
  log(s){ this.out.push(String(s)); }
  exec(c){
    if(c.tipo==='decl_var'){ this.vars[c.id]=c.expr?this.av(c.expr):undefined; return; }
    if(c.tipo==='atribuicao'){ if(!(c.id in this.vars))
      throw new Error("Variavel '"+c.id+"' nao declarada");
      this.vars[c.id]=this.av(c.expr); return; }
    if(c.tipo==='atribuicao_alvo'){ const base=this.av(c.alvo.base);
      const v=this.av(c.expr);
      if(c.alvo.tipo==='index') base[this.av(c.alvo.idx)]=v;
      else base[c.alvo.prop]=v; return; }
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
    if(c.tipo==='escreva'){ this.log(this.av(c.expr)); return; }
    if(c.tipo==='retorne'){ this.ret=this.av(c.expr); return; }
    if(c.tipo==='funcao'){ this.funcs[c.id]={params:c.params,corpo:c.corpo}; return; }
    if(c.tipo==='chamada_comando'){ this.av(c.chamada); return; }
    if(c.tipo==='bloco'){ this.bloco(c); return; }
    if(c.tipo==='importar'){ this.log('[G5] modulo "'+c.modulo+'" carregado'); return; }
    if(c.tipo==='tarefa'){ this.bloco(c.corpo);
      this.log("[G5] tarefa '"+c.nome+"' em segundo plano"); return; }
    if(c.tipo==='so'){ this.execSO(c); return; }
    throw new Error('Comando '+c.tipo);
  }
  bloco(b){ for(const x of b.comandos){ this.exec(x);
    if(this.ret!==null)break; } }
  execSO(c){
    const vals=(c.args||[]).map(a=>this.av(a));
    if(c.acao==='boot'){ this.log('[G5][boot] VessieOS v5 inicializando... dispositivos OK'); return; }
    if(c.acao==='desligar'){ this.log('[G5] desligando...'); return; }
    if(c.acao==='processo.criar'){ const nome=vals[0];
      const pid=++this.pidSeq; this.proc[pid]={nome,pid,estado:'rodando'};
      this.log('[G5][processo] criado '+nome+' pid='+pid); return pid; }
    if(c.acao==='processo.listar'){ const ks=Object.keys(this.proc);
      this.log('[G5][processo] total='+ks.length+' pids='+ks.join(',')); return ks.length; }
    if(c.acao==='processo.matar'){ const pid=vals[0];
      delete this.proc[pid]; this.log('[G5][processo] morto pid='+pid); return true; }
    if(c.acao==='janela.abrir'){ const t=vals[0];
      this.janelas[t]={titulo:t}; this.log('[G5][janela] aberta "'+t+'"'); return t; }
    if(c.acao==='janela.fechar'){ const t=vals[0];
      delete this.janelas[t]; this.log('[G5][janela] fechada "'+t+'"'); return true; }
    if(c.acao==='arquivo.escrever'){ this.fs[vals[0]]=vals[1];
      this.log('[G5][arquivo] escrito '+vals[0]); return true; }
    if(c.acao==='arquivo.ler'){ const v=this.fs[vals[0]]||'';
      this.log('[G5][arquivo] lido '+vals[0]+' = '+v); return v; }
    if(c.acao==='arquivo.listar'){ const ks=Object.keys(this.fs);
      this.log('[G5][arquivo] '+ks.join(',')); return ks; }
    if(c.acao==='driver.carregar'){ this.drivers[vals[0]]=true;
      this.log('[G5][driver] '+vals[0]+' OK'); return true; }
    if(c.acao==='permissao.conceder'){ this.log('[G5][permissao] '+vals[0]+' -> '+vals[1]); return true; }
    if(c.acao==='syscall.chamar'){ this.log('[G5][syscall] '+vals[0]); return 'ok'; }
    if(c.acao==='rede.conectar'){ this.rede.online=true;
      this.log('[G5][rede] online '+vals[0]); return true; }
    if(c.acao==='sistema.info'){ this.log('[G5][sistema] VessieOS 5.0 | procs='+Object.keys(this.proc).length); return 'VessieOS 5.0'; }
    this.log('[G5][so] '+c.acao+' '+vals.join(' ')); return vals[0];
  }
  av(e){ if(!e) return undefined;
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
    if(e.tipo==='so_expr'){ const vals=e.args.map(a=>this.av(a));
      const tmp={tipo:'so',acao:e.acao,args:e.args};
      const saved=[]; for(const a of e.args) saved.push(this.av(a));
      return this.execSOValor(e.acao, saved); }
    throw new Error('Expressao '+e.tipo); }
  call(c){ const args=c.args.map(a=>this.av(a));
    if(c.id==='tamanho') return args[0].length;
    if(c.id==='empurrar'){ args[0].push(args[1]); return args[0]; }
    if(c.id==='texto_maiusculo') return String(args[0]).toUpperCase();
    if(!(c.id in this.funcs)) throw new Error("Funcao '"+c.id+"' nao definida");
    const f=this.funcs[c.id]; const pv=this.vars; const pr=this.ret;
    const sc={}; for(const k in pv) sc[k]=pv[k];
    for(let i=0;i<f.params.length;i++) sc[f.params[i]]=args[i];
    this.vars=sc; this.ret=null;
    try{ this.bloco(f.corpo); } finally{ const r=this.ret!==null?this.ret:undefined;
      this.vars=pv; this.ret=pr; return r; } }
  truth(v){ if(typeof v==='boolean')return v; if(typeof v==='number')return v!==0;
    if(typeof v==='string')return v.length>0;
    if(v===null||v===undefined)return false; return true; }
  execSOValor(acao, vals){
    if(acao==='processo.criar'){ const pid=++this.pidSeq;
      this.proc[pid]={nome:vals[0],pid,estado:'rodando'};
      this.log('[G5][processo] criado '+vals[0]+' pid='+pid); return pid; }
    if(acao==='arquivo.ler'){ const vv=this.fs[vals[0]]||'';
      this.log('[G5][arquivo] lido '+vals[0]+' = '+vv); return vv; }
    if(acao==='sistema.info'){ this.log('[G5][sistema] VessieOS 5.0'); return 'VessieOS 5.0'; }
    if(acao==='syscall.chamar'){ this.log('[G5][syscall] '+vals[0]); return 'ok'; }
    return vals[0];
  }
}
function executarG5(codigo){
  try{ const t=tokG5(codigo); const p=new ParserG5(t);
    return new InterpG5().executar(p.parseProgram()); }
  catch(e){ return 'ERRO[G5]: '+e.message; }
}
global.executarG5=executarG5; global.G5_Lang={executar:executarG5,versao:'5.0.0'};
if(typeof module!=='undefined'&&module.exports) module.exports={executarG5};
})(typeof window!=='undefined'?window:globalThis);



















// VL_Full.js - VessieLang FULL p/ SO (func/func anonima/class/import/system/file/process/gui/storage/crypto/audio/clipboard/power/backup/diagnostic/math/string/date/json/network/game)
// Compativel B1/J3/G5 + numeros normais. API: executarFULL(codigo)
(function (global) {
'use strict';
// -- LEXER (numeros normais) --
function tokFULL(codigo) {
  const T=[]; let pos=0; const len=codigo.length; let linha=1, coluna=1;
  const KW=new Set(['var','se','senao','enquanto','para','cada','em','func','funcao','function','retorne','return','escreva','verdadeiro','falso','nulo','null','importar','import','tarefa','class','this','new','como','as']);
  function adv(n){ for(let i=0;i<n;i++){ if(codigo[pos]==='\n'){linha++;coluna=1;} else coluna++; pos++; } }
  while(pos<len){
    const ch=codigo[pos];
    if(ch===' '||ch==='\t'||ch==='\r'){ adv(1); continue; }
    if(ch==='\n'){ adv(1); continue; }
    if(ch==='/'&&codigo[pos+1]==='/'){ while(pos<len&&codigo[pos]!=='\n') adv(1); continue; }
    if(ch==='/'&&codigo[pos+1]==='*'){ adv(2); while(pos<len&&!(codigo[pos]==='*'&&codigo[pos+1]==='/')) adv(1); adv(2); continue; }
    if(ch==='"'||ch==="'"){ const q=ch; adv(1); let s='';
      while(pos<len&&codigo[pos]!==q){ if(codigo[pos]==='\\'){ adv(1); if(pos<len){ const e=codigo[pos]; if(e==='n')s+='\n'; else if(e==='t')s+='\t'; else s+=e; adv(1);} } else { s+=codigo[pos]; adv(1); } }
      adv(1); T.push({tipo:'STRING',valor:s,linha,coluna}); continue; }
    if(/[0-9]/.test(ch)){ const ic=coluna; let num='';
      if(ch==='0'&&'xXbBoO'.includes(codigo[pos+1]||'')){ num+=codigo[pos]; adv(1); num+=codigo[pos]; adv(1);
        while(pos<len&&/[0-9a-fA-F_]/.test(codigo[pos])){ const c2=codigo[pos]; if(c2!=='_')num+=c2; adv(1); }
        const b=num[1].toLowerCase(); let v=num;
        if(b==='x')v=parseInt(num.slice(2),16); else if(b==='b')v=parseInt(num.slice(2),2); else v=parseInt(num.slice(2),8);
        T.push({tipo:'NUMERO',valor:v,linha,coluna:ic}); continue; }
      while(pos<len&&/[0-9_]/.test(codigo[pos])){ const d=codigo[pos]; if(d!=='_')num+=d; adv(1); }
      if(codigo[pos]==='.'&&/[0-9]/.test(codigo[pos+1]||'')){ num+='.'; adv(1);
        while(pos<len&&/[0-9_]/.test(codigo[pos])){ const e2=codigo[pos]; if(e2!=='_')num+=e2; adv(1); }
        T.push({tipo:'NUMERO',valor:parseFloat(num),linha,coluna:ic}); }
      else T.push({tipo:'NUMERO',valor:parseInt(num,10),linha,coluna:ic});
      continue; }
    const dois=codigo.substr(pos,2);
    if(['==','!=','<=','>=','&&','||'].includes(dois)){ T.push({tipo:'OPERADOR',valor:dois,linha,coluna}); adv(2); continue; }
    if('+-*/%=<>!(){}[];,:.'.includes(ch)){ T.push({tipo:'+-*/%=<>!'.includes(ch)?'OPERADOR':'PONTUACAO',valor:ch,linha,coluna}); adv(1); continue; }
    if(/[a-zA-Z_]/.test(ch)){ let id=''; const c0=coluna;
      while(pos<len&&/[a-zA-Z0-9_]/.test(codigo[pos])){ id+=codigo[pos]; adv(1); }
      T.push({tipo:KW.has(id)?'PALAVRA_CHAVE':'IDENTIFICADOR',valor:id,linha,coluna:c0}); continue; }
    throw new Error("char '"+ch+"' linha "+linha);
  }
  T.push({tipo:'FIM',valor:null,linha,coluna}); return T;
}
class ParserFULL {
  constructor(t){ this.t=t; this.pos=0; }
  peek(){ return this.t[this.pos]; } next(){ return this.t[this.pos++]; }
  match(t,v){ const k=this.peek(); if(k.tipo===t&&(v===undefined||k.valor===v)) return this.next(); return null; }
  expect(t,v){ const k=this.match(t,v); if(!k){ const a=this.peek(); throw new Error('Esperado '+(v||t)+' achou '+a.valor+' linha '+a.linha); } return k; }
  normFunc(s){ return (s==='func'||s==='function')?'funcao':s; }
  normRet(s){ return (s==='return')?'retorne':s; }
  parseProgram(){ const c=[]; while(this.peek().tipo!=='FIM') c.push(this.parseComando()); return {tipo:'programa',comandos:c}; }
  parseComando(){
    const tok=this.peek();
    if(tok.tipo==='PALAVRA_CHAVE'){
      let v=tok.valor; if(v==='func'||v==='function') v='funcao'; if(v==='return') v='retorne'; if(v==='import') v='importar';
      if(v==='var'){ this.next(); const id=this.expect('IDENTIFICADOR').valor; let e=null; if(this.match('OPERADOR','=')) e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'decl_var',id,expr:e}; }
      if(v==='escreva'){ this.next(); this.expect('PONTUACAO','('); const e=this.parseExpressao(); this.expect('PONTUACAO',')'); this.expect('PONTUACAO',';'); return {tipo:'escreva',expr:e}; }
      if(v==='retorne'){ this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'retorne',expr:e}; }
      if(v==='se'){ this.next(); this.expect('PONTUACAO','('); const c=this.parseExpressao(); this.expect('PONTUACAO',')'); const b=this.parseBloco(); let s=null; if(this.peek().valor==='senao'){ this.next(); s=this.parseBloco(); } return {tipo:'se',cond:c,corpo:b,senao:s}; }
      if(v==='enquanto'){ this.next(); this.expect('PONTUACAO','('); const c=this.parseExpressao(); this.expect('PONTUACAO',')'); return {tipo:'enquanto',cond:c,corpo:this.parseBloco()}; }
    if(v==='funcao'||v==='func'||v==='function'||v==='class'||v==='importar'||v==='import'||v==='tarefa'||v==='para') return this.parseSO();
      const so2=['sistema','processo','janela','arquivo','driver','permissao','boot','desligar','syscall','rede','system','file','process','gui','network'];
      if(so2.includes(v)) return this.parseSO();
    }
    if(tok.tipo==='IDENTIFICADOR'){
      const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='='){ const id=this.next().valor; this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'atribuicao',id,expr:e}; }
      if(nx&&nx.valor==='('){ const ch=this.parseChamada(); this.expect('PONTUACAO',';'); return {tipo:'chamada_comando',chamada:ch}; }
      if(nx&&nx.valor==='.'){ const alvo=this.parseAlvo();
        if(this.peek().valor==='('){ const args=this.parseArgsParen(); this.expect('PONTUACAO',';'); return {tipo:'chamada_comando',chamada:{tipo:'chamada_ns',base:alvo,args}}; }
        if(this.peek().valor==='='){ this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'atribuicao_alvo',alvo,expr:e}; }
        throw new Error('Comando ponto linha '+tok.linha); }
      const alvo=this.parseAlvo();
      if(this.peek().valor==='='){ this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',';'); return {tipo:'atribuicao_alvo',alvo,expr:e}; }
      if(this.peek().valor==='('){ const args=this.parseArgsParen(); this.expect('PONTUACAO',';'); return {tipo:'chamada_comando',chamada:{tipo:'chamada_ns',base:alvo,args}}; }
      throw new Error('Comando invalido linha '+tok.linha);
    }
    if(tok.valor==='{') return this.parseBloco();
    throw new Error("Comando '"+tok.valor+"' linha "+tok.linha);
  }
  parseAlvo(){ let b;
    if(this.peek().valor==='this'){ this.next(); b={tipo:'variavel',valor:'this'}; }
    else b={tipo:'variavel',valor:this.expect('IDENTIFICADOR').valor};
    while(true){ if(this.peek().valor==='['){ this.next(); const ix=this.parseExpressao(); this.expect('PONTUACAO',']'); b={tipo:'index',base:b,idx:ix}; }
      else if(this.peek().valor==='.'){ this.next(); const pr=this.peek().valor; this.next(); b={tipo:'prop',base:b,prop:pr}; }
      else break; }
    return b; }
  parseArgsParen(){ this.expect('PONTUACAO','('); const a=[];
    if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }while(this.match('PONTUACAO',',')); }
    this.expect('PONTUACAO',')'); return a; }
  parseBloco(){ this.expect('PONTUACAO','{'); const c=[];
    while(this.peek().valor!=='}') c.push(this.parseComando());
    this.expect('PONTUACAO','}'); return {tipo:'bloco',comandos:c}; }
  parseSO(){
    let k=this.next().valor;
    if(k==='func'||k==='function') k='funcao'; if(k==='return') k='retorne'; if(k==='import') k='importar';
    if(k==='funcao'){
      if(this.peek().valor==='('){ const p=[];
        if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }while(this.match('PONTUACAO',',')); }
        this.expect('PONTUACAO',')'); return {tipo:'funcao',id:'main',params:p,corpo:this.parseBloco()}; }
      let id=null;
      if(this.peek().tipo==='IDENTIFICADOR') id=this.next().valor;
      else if(this.peek().valor==='main'){ this.next(); id='main'; }
      else id=this.expect('IDENTIFICADOR').valor;
      this.expect('PONTUACAO','('); const p=[];
      if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',')'); return {tipo:'funcao',id,params:p,corpo:this.parseBloco()}; }
    if(k==='class'){ const id=this.expect('IDENTIFICADOR').valor;
      this.expect('PONTUACAO','{'); const met=[];
      while(this.peek().valor!=='}'){ let mn=this.next().valor; if(mn==='func'||mn==='function') mn=this.next().valor;
        this.expect('PONTUACAO','('); const p=[];
        if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }while(this.match('PONTUACAO',',')); }
        this.expect('PONTUACAO',')'); met.push({nome:mn,params:p,corpo:this.parseBloco()}); }
      this.expect('PONTUACAO','}'); return {tipo:'classe',id,metodos:met}; }
    if(k==='importar'||k==='import'){ const m=this.expect('STRING').valor;
      let alias=null; if(this.peek().valor==='como'||this.peek().valor==='as'){ this.next(); alias=this.expect('IDENTIFICADOR').valor; }
      this.expect('PONTUACAO',';'); return {tipo:'importar',modulo:m,alias}; }
    if(k==='tarefa'){ const n=this.expect('STRING').valor; return {tipo:'tarefa',nome:n,corpo:this.parseBloco()}; }
    if(k==='para'){ if(this.peek().valor==='cada'){ this.next(); this.expect('PONTUACAO','(');
      const v=this.expect('IDENTIFICADOR').valor;
      let em=this.next().valor; const it=this.parseExpressao(); this.expect('PONTUACAO',')');
      return {tipo:'para_cada',variavel:v,iter:it,corpo:this.parseBloco()}; }
      this.expect('PONTUACAO','('); let init=null; const ti=this.peek();
      if(ti.valor==='var'){ this.next(); const id=this.expect('IDENTIFICADOR').valor;
        let e=null; if(this.match('OPERADOR','=')) e=this.parseExpressao(); init={tipo:'decl_var',id,expr:e}; }
      this.expect('PONTUACAO',';'); const cond=this.parseExpressao(); this.expect('PONTUACAO',';'); let inc=null;
      if(this.peek().tipo==='IDENTIFICADOR'){ const nx=this.t[this.pos+1];
        if(nx&&nx.valor==='='){ const id=this.next().valor; this.next(); inc={tipo:'atribuicao',id,expr:this.parseExpressao()}; } }
      this.expect('PONTUACAO',')'); return {tipo:'para',init,cond,inc,corpo:this.parseBloco()}; }
    if(k==='boot'){ this.expect('PONTUACAO',';'); return {tipo:'so',acao:'boot'}; }
    if(k==='desligar'){ this.expect('PONTUACAO',';'); return {tipo:'so',acao:'desligar'}; }
    const soCmd=['sistema','processo','janela','arquivo','driver','permissao','syscall','rede','system','file','process','gui','network','storage','crypto','audio','clipboard','power','backup','diagnostic','math','string','date','json','game'];
    if(soCmd.includes(k)){
      if(this.peek().valor==='('){ const a=this.parseArgsParen(); this.expect('PONTUACAO',';'); return {tipo:'so',acao:k,args:a}; }
      const sub=this.next().valor;
      if(this.peek().valor==='('){ const a=this.parseArgsParen(); this.expect('PONTUACAO',';'); return {tipo:'so',acao:k+'.'+sub,args:a}; }
      throw new Error('SO sintaxe '+k);
    }
    throw new Error('Comando '+k);
  }
  parseChamada(){ const id=this.expect('IDENTIFICADOR').valor;
    const a=this.parseArgsParen(); return {tipo:'chamada',id,args:a}; }
  parseChamadaMain(){ this.expect('PALAVRA_CHAVE','main');
    const a=this.parseArgsParen(); return {tipo:'chamada',id:'main',args:a}; }
  parseExpressao(){ return this.parseOu(); }
  parseOu(){ let e=this.parseE(); while(this.match('OPERADOR','||')) e={tipo:'binop',op:'||',esq:e,dir:this.parseE()}; return e; }
  parseE(){ let e=this.parseComp(); while(this.match('OPERADOR','&&')) e={tipo:'binop',op:'&&',esq:e,dir:this.parseComp()}; return e; }
  parseComp(){ let e=this.parseAd(); const ops=['==','!=','<','>','<=','>='];
    while(true){ const t=this.peek(); if(t.tipo==='OPERADOR'&&ops.includes(t.valor)) e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseAd()}; else break; } return e; }
  parseAd(){ let e=this.parseMul(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='+'||t.valor==='-')) e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseMul()}; else break; } return e; }
  parseMul(){ let e=this.parseUn(); while(true){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='*'||t.valor==='/'||t.valor==='%')) e={tipo:'binop',op:this.next().valor,esq:e,dir:this.parseUn()}; else break; } return e; }
  parseUn(){ const t=this.peek();
    if(t.tipo==='OPERADOR'&&(t.valor==='!'||t.valor==='-')) return {tipo:'unario',op:this.next().valor,expr:this.parseUn()};
    return this.parsePrim(); }
  parsePrim(){
    const t=this.peek();
    if(t.tipo==='NUMERO'||t.tipo==='STRING'){ this.next(); return {tipo:t.tipo.toLowerCase(),valor:t.valor}; }
    if(t.valor==='verdadeiro'){ this.next(); return {tipo:'booleano',valor:true}; }
    if(t.valor==='falso'){ this.next(); return {tipo:'booleano',valor:false}; }
    if(t.valor==='nulo'||t.valor==='null'){ this.next(); return {tipo:'nulo',valor:null}; }
    if(t.valor==='['){ this.next(); const els=[];
      if(this.peek().valor!==']'){ do{ els.push(this.parseExpressao()); }while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',']'); return this.parseSufixo({tipo:'lista',elementos:els}); }
    if(t.valor==='{'){ this.next(); const pares=[];
      if(this.peek().valor!=='}'){ do{ const k=this.peek(); let chave=null;
        if(k.tipo==='STRING'||k.tipo==='IDENTIFICADOR'){ chave=k.valor; this.next(); }
        else throw new Error('Chave '+k.linha);
        this.expect('PONTUACAO',':'); pares.push([chave,this.parseExpressao()]); }while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO','}'); return this.parseSufixo({tipo:'dicionario',pares}); }
    if(t.valor==='func'||t.valor==='function'){ this.next();
      this.expect('PONTUACAO','('); const p=[];
      if(this.peek().valor!==')'){ do{ p.push(this.expect('IDENTIFICADOR').valor); }while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',')'); const corpo=this.parseBloco();
      return {tipo:'func_anon',params:p,corpo}; }
    if(t.valor==='new'){ this.next(); const cn=this.expect('IDENTIFICADOR').valor;
      const a=this.parseArgsParen(); return this.parseSufixo({tipo:'novo',classe:cn,args:a}); }
    const ids=['system','file','process','gui','network','storage','crypto','audio','clipboard','power','backup','diagnostic','math','string','date','json','game','sistema','processo','janela','arquivo','driver','permissao','syscall','rede'];
    if(t.tipo==='PALAVRA_CHAVE'&&ids.includes(t.valor)){ const kk=this.next().valor;
      const sub=this.next().valor;
      this.expect('PONTUACAO','('); const a=[];
      if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }while(this.match('PONTUACAO',',')); }
      this.expect('PONTUACAO',')'); return this.parseSufixo({tipo:'ns',ns:kk,metodo:sub,args:a}); }
    if(t.tipo==='IDENTIFICADOR'){
      const ids2=['system','file','process','gui','network','storage','crypto','audio','clipboard','power','backup','diagnostic','math','string','date','json','game'];
      const nx0=this.t[this.pos+1];
      if(ids2.includes(t.valor)&&nx0&&nx0.valor==='.'){ const kk=this.next().valor; this.next();
        const sub=this.next().valor;
        this.expect('PONTUACAO','('); const a=[];
        if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }while(this.match('PONTUACAO',',')); }
        this.expect('PONTUACAO',')'); return this.parseSufixo({tipo:'ns',ns:kk,metodo:sub,args:a}); }
      const nx=this.t[this.pos+1];
      if(nx&&nx.valor==='('){ let n0=this.parseChamada(); return this.parseSufixo(n0); }
      this.next(); return this.parseSufixo({tipo:'variavel',valor:t.valor}); }
    if(t.valor==='this'){ this.next(); return this.parseSufixo({tipo:'variavel',valor:'this'}); }
    if(t.valor==='('){ this.next(); const e=this.parseExpressao(); this.expect('PONTUACAO',')'); return this.parseSufixo(e); }
    if(t.tipo==='PALAVRA_CHAVE'&&t.valor==='para'){ this.next();
      this.expect('PONTUACAO','('); const v=this.expect('IDENTIFICADOR').valor;
      this.expect('IDENTIFICADOR','var'); throw new Error('para so como comando'); }
    throw new Error('Expressao '+t.valor+' linha '+t.linha);
  }
  parseSufixo(n){
    while(true){
      if(this.peek().valor==='['){ this.next(); const ix=this.parseExpressao(); this.expect('PONTUACAO',']'); n={tipo:'index',base:n,idx:ix}; }
      else if(this.peek().valor==='.'){ this.next(); const pr=this.next().valor;
        if(this.peek().valor==='('){ this.next(); const a=[];
          if(this.peek().valor!==')'){ do{ a.push(this.parseExpressao()); }while(this.match('PONTUACAO',',')); }
          this.expect('PONTUACAO',')'); n={tipo:'metodo',base:n,metodo:pr,args:a}; }
        else n={tipo:'prop',base:n,prop:pr}; }
      else if(this.peek().valor==='('&&n.tipo==='variavel'){ const a=this.parseArgsParen(); n={tipo:'chamada',id:n.valor,args:a}; }
      else break; }
    return n; }
}
const NSNomes=new Set(['system','file','process','gui','network','storage','crypto','audio','clipboard','power','backup','diagnostic','math','string','date','json','game','sistema','processo','janela','arquivo','driver','permissao','syscall','rede',
  // Namespaces adicionados na integração com o kernel do VessieOS (ver
  // JS/kernel/modules/vessielang/lib/runtime-bridge.js): permitem que
  // scripts .vl chamem IA local (LM Studio), rede real e o coletor de
  // jogos/conteúdo web do VessieOS diretamente, ex: `ai.ask("...")`.
  'ai','net','collector','vessieos']);
class InterpFULL {
  constructor(){ this.vars={}; this.funcs={}; this.classes={}; this.out=[]; this.ret=null; this.pidS=2000; this.proc={}; }
  executar(ast){ for(const c of ast.comandos){ this.exec(c); if(this.ret!==null) this.ret=null; } return this.out.join('\n'); }
  log(s){ this.out.push(String(s)); }
  exec(c){
    if(c.tipo==='decl_var'){ this.vars[c.id]=c.expr?this.av(c.expr):undefined; return; }
    if(c.tipo==='atribuicao'){ if(c.id==='this') throw new Error('this imutavel');
      if(!(c.id in this.vars)) throw new Error("var '"+c.id+"' nao declarada"); this.vars[c.id]=this.av(c.expr); return; }
    if(c.tipo==='atribuicao_alvo'){ const v=this.av(c.expr); this.setAlvo(c.alvo,v); return; }
    if(c.tipo==='se'){ if(this.truth(this.av(c.cond))) this.bloco(c.corpo); else if(c.senao) this.bloco(c.senao); return; }
    if(c.tipo==='enquanto'){ while(this.truth(this.av(c.cond))){ this.bloco(c.corpo); if(this.ret!==null)break; } return; }
    if(c.tipo==='para'){ if(c.init){ if(c.init.tipo==='decl_var') this.vars[c.init.id]=c.init.expr?this.av(c.init.expr):undefined; else this.exec(c.init); }
      while(this.truth(this.av(c.cond))){ this.bloco(c.corpo); if(this.ret!==null)break; if(c.inc) this.exec(c.inc); } return; }
    if(c.tipo==='para_cada'){ const it=this.av(c.iter); const arr=Array.isArray(it)?it:Object.values(it||{});
      for(const v of arr){ this.vars[c.variavel]=v; this.bloco(c.corpo); if(this.ret!==null)break; } return; }
    if(c.tipo==='escreva'){ this.log(this.av(c.expr)); return; }
    if(c.tipo==='retorne'){ this.ret=this.av(c.expr); return; }
    if(c.tipo==='funcao'){ this.funcs[c.id]={params:c.params,corpo:c.corpo}; return; }
    if(c.tipo==='classe'){ this.classes[c.id]={metodos:c.metodos}; return; }
    if(c.tipo==='chamada_comando'){ this.av(c.chamada); return; }
    if(c.tipo==='bloco'){ this.bloco(c); return; }
    if(c.tipo==='importar'){ this.vars[c.alias||c.modulo]={__ns:c.modulo}; this.log('[FULL] import "'+c.modulo+'"'+(c.alias?' como '+c.alias:'')); return; }
    if(c.tipo==='tarefa'){ this.bloco(c.corpo); this.log("[FULL] tarefa '"+c.nome+"' background"); return; }
    if(c.tipo==='so'){ this.execSO(c); return; }
    throw new Error('Comando '+c.tipo);
  }
  bloco(b){ for(const x of b.comandos){ this.exec(x); if(this.ret!==null)break; } }
  setAlvo(a,v){
    if(a.tipo==='variavel'){ if(a.valor==='this') throw new Error('this');
      if(!(a.valor in this.vars)) throw new Error("var '"+a.valor+"'"); this.vars[a.valor]=v; return; }
    if(a.tipo==='prop'){ const b=this.av(a.base); b[a.prop]=v; return; }
    if(a.tipo==='index'){ const b=this.av(a.base); b[this.av(a.idx)]=v; return; }
    if(a.tipo==='metodo') throw new Error('nao atribuivel');
  }
  av(e){
    if(!e) return undefined;
    if(e.tipo==='numero'||e.tipo==='string'||e.tipo==='booleano') return e.valor;
    if(e.tipo==='nulo') return null;
    if(e.tipo==='lista') return e.elementos.map(x=>this.av(x));
    if(e.tipo==='dicionario'){ const o={}; for(const kv of e.pares) o[kv[0]]=this.av(kv[1]); return o; }
    if(e.tipo==='variavel'){ if(e.valor in this.vars) return this.vars[e.valor]; if(NSNomes.has(e.valor)) return {__ns:e.valor}; throw new Error("var '"+e.valor+"'"); }
    if(e.tipo==='func_anon') return {__func:true,params:e.params,corpo:e.corpo};
    if(e.tipo==='novo') return this.instanciar(e.classe, e.args.map(a=>this.av(a)));
    if(e.tipo==='unario'){ const v=this.av(e.expr); return e.op==='-'?-v:!this.truth(v); }
    if(e.tipo==='binop'){ const a=this.av(e.esq), b=this.av(e.dir);
      if(e.op==='+')return a+b; if(e.op==='-')return a-b; if(e.op==='*')return a*b;
      if(e.op==='/')return a/b; if(e.op==='%')return a%b;
      if(e.op==='==')return a===b; if(e.op==='!=')return a!==b;
      if(e.op==='<')return a<b; if(e.op==='>')return a>b;
      if(e.op==='<=')return a<=b; if(e.op==='>=')return a>=b;
      if(e.op==='&&')return a&&b; if(e.op==='||')return a||b; throw new Error('op'); }
    if(e.tipo==='index') return this.av(e.base)[this.av(e.idx)];
    if(e.tipo==='prop'){ const b=this.av(e.base); return b[e.prop]; }
    if(e.tipo==='chamada') return this.call(e.id, e.args.map(a=>this.av(a)));
    if(e.tipo==='chamada_ns') return this.callNS(e.base, e.args.map(a=>this.av(a)));
    if(e.tipo==='ns') return this.ns(e.ns, e.metodo, e.args.map(a=>this.av(a)));
    if(e.tipo==='metodo') return this.metodo(e.base, e.metodo, e.args.map(a=>this.av(a)));
    throw new Error('Expr '+e.tipo);
  }
  call(id, args){
    if(id==='tamanho') return args[0].length;
    if(id==='empurrar'){ args[0].push(args[1]); return args[0]; }
    if(id==='texto_maiusculo') return String(args[0]).toUpperCase();
    if(id in this.vars && this.vars[id] && this.vars[id].__func)
      return this.runFunc(this.vars[id], args);
    if(id in this.classes) return this.instanciar(id, args);
    if(!(id in this.funcs)) throw new Error("func '"+id+"'");
    return this.runFunc(this.funcs[id], args);
  }
  runFunc(f, args){
    const pv=this.vars; const pr=this.ret; const sc={};
    for(const k in pv) sc[k]=pv[k];
    for(let i=0;i<f.params.length;i++) sc[f.params[i]]=args[i];
    this.vars=sc; this.ret=null;
    let r;
    try{ this.bloco(f.corpo); r=(this.ret!==null?this.ret:undefined); }
    finally{ for(const k in pv) if(pv[k]!==sc[k]) pv[k]=sc[k]; this.vars=pv; this.ret=pr; }
    return r;
  }
  instanciar(classe, args){
    const c=this.classes[classe]; if(!c) throw new Error('classe '+classe);
    const obj={__classe:classe};
    const init=c.metodos.find(m=>m.nome==='init');
    if(init){ const pv=this.vars; const pr=this.ret; const sc={};
      for(const k in pv) sc[k]=pv[k]; sc['this']=obj;
      for(let i=0;i<init.params.length;i++) sc[init.params[i]]=args[i];
      this.vars=sc; this.ret=null;
      try{ this.bloco(init.corpo); } finally{ for(const k in pv) if(pv[k]!==sc[k]) pv[k]=sc[k]; this.vars=pv; this.ret=pr; } }
    obj.__metodos=c.metodos; obj.__interp=this; return obj;
  }
  callNS(base, args){
    const m=base.prop || base.metodo;
    const bn=base.base;
    if(bn&&bn.tipo==='variavel'&&!(bn.valor in this.vars)&&NSNomes.has(bn.valor)) return this.ns(bn.valor, m, args);
    const obj=this.av(bn);
    if(obj&&obj.__ns) return this.ns(obj.__ns, m, args);
    if(obj&&obj.__metodos){ const mt=obj.__metodos.find(x=>x.nome===m);
      if(!mt) throw new Error('metodo '+m);
      const pv=this.vars; const pr=this.ret; const sc={};
      for(const k in pv) sc[k]=pv[k]; sc['this']=obj;
      for(let i=0;i<mt.params.length;i++) sc[mt.params[i]]=args[i];
      this.vars=sc; this.ret=null;
      let r;
      try{ this.bloco(mt.corpo); r=(this.ret!==null?this.ret:undefined); }
      finally{ for(const k in pv) if(pv[k]!==sc[k]) pv[k]=sc[k]; this.vars=pv; this.ret=pr; }
      return r; }
    if(obj&&obj[m]&&obj[m].__func) return this.runFunc(obj[m], args);
    return this.metodo(bn, m, args);
  }
  metodo(baseNode, m, args){
    if(baseNode&&baseNode.tipo==='variavel'&&!(baseNode.valor in this.vars)&&NSNomes.has(baseNode.valor)) return this.ns(baseNode.valor, m, args);
    const obj=this.av(baseNode);
    if(obj&&obj.__ns) return this.ns(obj.__ns, m, args);
    if(obj&&typeof obj[m]==='function') return obj[m](...args);
    if(obj&&obj[m]!==undefined && args.length===0) return obj[m];
    const mapa={ push:'push', splice:'splice', map:'map', clear:'clear', add:'add', getText:'getText', setText:'setText' };
    if(Array.isArray(obj) && mapa[m]){ if(m==='push'){ obj.push(args[0]); return obj; } if(m==='splice'){ return obj.splice(args[0],args[1]); } if(m==='map'){ return 'mapped'; } }
    throw new Error('metodo '+m);
  }
  ns(ns, metodo, args){
    const G=global; const A=(i)=>args[i];
    const mapa={
      'system.print':()=>{ this.log(A(0)); return A(0); },
      'system.sleep':()=>'sleep '+A(0)+'ms',
      'system.exec':()=>G.OS?G.OS.terminal(A(0)):'exec '+A(0),
      'system.env':()=>'env:'+A(0),
      'system.memory':()=>({used:128,total:1024}),
      'system.cpu':()=>5,
      'system.user':()=>G.Security?G.Security.user:'admin',
      'system.datetime':()=>new Date().toISOString(),
      'system.exit':()=>'exit '+A(0),
      'file.read':()=>G.FS.readFile(A(0)),
      'file.write':()=>{ G.FS.writeFile(A(0),A(1)); this.log('[file] escrito '+A(0)); return true; },
      'file.append':()=>{ G.FS.appendFile(A(0),A(1)); return true; },
      'file.delete':()=>G.FS.deleteFile(A(0)),
      'file.move':()=>G.FS.move(A(0),A(1)),
      'file.copy':()=>G.FS.copy(A(0),A(1)),
      'file.exists':()=>G.FS.exists(A(0)),
      'file.size':()=>G.FS.size(A(0)),
      'file.list':()=>G.FS.listDir(A(0)),
      'file.mkdir':()=>G.FS.mkdir(A(0)),
      'file.rmdir':()=>G.FS.rmdir(A(0))
    };
    const mapa2={
      'process.start':()=>{ const pid=++this.pidS; this.proc[pid]={nome:A(0)}; this.log('[process] start '+A(0)+' pid='+pid); return pid; },
      'process.kill':()=>{ delete this.proc[A(0)]; return true; },
      'process.list':()=>Object.keys(this.proc),
      'process.wait':()=>'wait '+A(0),
      'process.spawn':()=>this.ns('process','start',[A(0),A(1)]),
      'gui.createWindow':()=>{ this.log('[gui] janela "'+A(0)+'"'); return A(0); },
      'gui.alert':()=>{ this.log('[ALERT] '+A(0)); return true; },
      'gui.prompt':()=>A(1)||'',
      'gui.confirm':()=>true,
      'gui.notify':()=>{ if(G.Modules) G.Modules.notify(A(0),A(1),A(2)); this.log('[notify] '+A(0)); return true; },
      'storage.set':()=>{ try{localStorage.setItem('vl_'+A(0),A(1));}catch(e){} return true; },
      'storage.get':()=>{ try{return localStorage.getItem('vl_'+A(0));}catch(e){return null;} },
      'storage.remove':()=>{ try{localStorage.removeItem('vl_'+A(0));}catch(e){} return true; },
      'storage.clear':()=>{ try{localStorage.clear();}catch(e){} return true; },
      'crypto.hash':()=>G.Security?G.Security.encrypt(String(A(0)),'h').slice(0,24):'hash:'+A(0),
      'crypto.encrypt':()=>G.Security?G.Security.encrypt(A(0),A(1)):'enc',
      'crypto.decrypt':()=>G.Security?G.Security.decrypt(A(0),A(1)):'dec',
      'audio.play':()=>G.Modules?G.Modules.audio.play(A(0)):'play',
      'audio.stop':()=>G.Modules?G.Modules.audio.stop():'stop',
      'audio.volume':()=>G.Modules?G.Modules.audio.volume(A(0)):'vol',
      'clipboard.copy':()=>G.Modules?G.Modules.clipboard.copy(A(0)):'copy',
      'clipboard.paste':()=>G.Modules?G.Modules.clipboard.paste():'',
      'power.suspend':()=>G.Modules?G.Modules.power.suspend():'susp',
      'power.shutdown':()=>G.Modules?G.Modules.power.shutdown():'off',
      'power.reboot':()=>G.Modules?G.Modules.power.reboot():'reboot',
      'power.info':()=>{ const r=G.Modules?G.Modules.power.info():'energia'; this.log(r); return r; },
      'backup.create':()=>{ const r=G.Modules?G.Modules.backup(A(0)):'backup'; this.log(r); return r; },
      'backup.restore':()=>'restore '+A(0),
      'diagnostic.check':()=>{ const r=G.Modules?G.Modules.diagnostic():'ok'; this.log(r); return r; }
    };
    const mapa3={
      'math.random':()=>Math.random(), 'math.sin':( )=>Math.sin(A(0)), 'math.cos':()=>Math.cos(A(0)),
      'math.sqrt':()=>Math.sqrt(A(0)), 'math.pow':()=>Math.pow(A(0),A(1)),
      'string.length':()=>String(A(0)).length, 'string.split':()=>String(A(0)).split(A(1)),
      'string.join':()=>A(1)!==undefined?A(0).join(A(1)):A(0).join(','),
      'string.replace':()=>String(A(0)).split(A(1)).join(A(2)),
      'string.substring':()=>String(A(0)).substring(A(1),A(2)),
      'date.now':()=>Date.now(), 'date.format':()=>new Date(A(0)).toISOString(),
      'json.stringify':()=>JSON.stringify(A(0)), 'json.parse':()=>JSON.parse(A(0)),
      'network.fetch':()=>'fetch '+A(0)+' (async simulado)',
      'network.ping':()=>'pong '+A(0), 'network.ip':()=>'192.168.0.10', 'network.status':()=> 'online',
      'game.abrir':()=>{ const r=G.GameHub?G.GameHub.abrir(A(0)):'+25XP'; this.log(r); return r; },
      'game.conquista':()=>{ const r=G.GameHub?G.GameHub.conquista(A(0)):'conquista'; this.log(r); return r; }
    };
    // mapa4 - APIs novas ligadas ao kernel real do VessieOS via
    // runtime-bridge.js (G.AI / G.Net / G.Collector). Todas as chamadas de
    // rede/IA/coleta são assíncronas por natureza, mas o interpretador FULL
    // é síncrono (ver InterpFULL.executar) — por isso cada uma dispara a
    // operação em segundo plano, devolve um aviso imediato, e o resultado
    // final chega por notificação (gui.notify/OS.toast) e pelos métodos
    // '.last'/'.lastGames'/'.lastWeb', que podem ser lidos depois (ex: em um
    // `tarefa` ou num loop de status) sem travar o restante do script.
    const mapa4={
      'ai.ask':()=>G.AI?G.AI.ask(A(0)):'[ai] indisponivel',
      'ai.last':()=>G.AI?G.AI.last:null,
      'ai.pendente':()=>!!(G.AI&&G.AI.pending),
      'ai.pending':()=>!!(G.AI&&G.AI.pending),
      'net.get':()=>G.Net?G.Net.get(A(0)):'[net] indisponivel',
      'net.post':()=>G.Net?G.Net.post(A(0),A(1)):'[net] indisponivel',
      'net.last':()=>G.Net?G.Net.last:null,
      'net.pendente':()=>!!(G.Net&&G.Net.pending),
      'net.pending':()=>!!(G.Net&&G.Net.pending),
      'collector.games':()=>G.Collector?G.Collector.games(A(0)):'[collector] indisponivel',
      'collector.web':()=>G.Collector?G.Collector.web(A(0)):'[collector] indisponivel',
      'collector.lastGames':()=>G.Collector?G.Collector.lastGames:[],
      'collector.lastWeb':()=>G.Collector?G.Collector.lastWeb:[],
      'collector.pendente':()=>!!(G.Collector&&G.Collector.pending),
      'collector.pending':()=>!!(G.Collector&&G.Collector.pending),
      'vessieos.info':()=>G.VessieOS?JSON.stringify({versao:(G.OS?G.OS.versao:'?')}):'{}',
      'vessieos.abrirApp':()=>{ if(typeof G.openApp==='function'){ G.openApp(A(0)); return 'abrindo '+A(0); } return 'openApp indisponivel'; },
      'vessieos.notificar':()=>{ if(G.Modules) G.Modules.notify(A(0),A(1),A(2)||'info'); return true; }
    };
    const key=ns+'.'+metodo;
    if(mapa[key]) return mapa[key]();
    if(mapa2[key]) return mapa2[key]();
    if(mapa3[key]) return mapa3[key]();
    if(mapa4[key]) return mapa4[key]();
    const alias={'sistema':'system','arquivo':'file','processo':'process','janela':'gui','rede':'network'};
    const n2=alias[ns]||ns;
    if((n2+'.'+metodo)!==key) return this.ns(n2, metodo, args);
    this.log('[FULL][so] '+key+' '+args.join(' ')); return args[0];
  }
  execSO(c){
    const vals=(c.args||[]).map(a=>this.av(a));
    if(c.acao==='boot'){ this.log('[FULL][boot] VessieOS'); return; }
    if(c.acao==='desligar'){ this.log('[FULL] off'); return; }
    const parts=String(c.acao).split('.');
    if(parts.length===2) return this.ns(parts[0], parts[1], vals);
    if(parts.length===1){ this.log('[FULL] '+c.acao); return vals[0]; }
  }
  truth(v){ if(typeof v==='boolean')return v; if(typeof v==='number')return v!==0;
    if(typeof v==='string')return v.length>0; if(v===null||v===undefined)return false; return true; }
}
function executarFULL(codigo){
  try{ const t=tokFULL(codigo); const p=new ParserFULL(t); return new InterpFULL().executar(p.parseProgram()); }
  catch(e){ return 'ERRO[FULL]: '+e.message; }
}
global.executarFULL=executarFULL; global.VL_Full={executar:executarFULL,versao:'1.0.0'};
global.tokFULL=tokFULL; global.ParserFULL=ParserFULL; global.InterpFULL=InterpFULL;
if(typeof module!=='undefined'&&module.exports) module.exports={executarFULL};
})(typeof window!=='undefined'?window:globalThis);


















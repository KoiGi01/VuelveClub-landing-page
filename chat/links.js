export const sectionLabels=Object.freeze({pricing:'Precios',demo:'Solicitar demo',features:'Qué incluye',login:'Iniciar sesión',customers:'Clientes',card:'Tu tarjeta',team:'Equipo y permisos',support:'Centro de soporte',whatsapp:'WhatsApp'});
export function helpLink(section,{origin='https://www.vuelveclub.com',pathname='/',organizationId=''}={}){
  const marketing=origin==='https://www.vuelveclub.com'||origin==='https://vuelveclub.com';
  const landing=marketing&&pathname==='/';
  const home=landing?'':'https://www.vuelveclub.com/';
  if(['pricing','demo','features'].includes(section))return `${home}#${{pricing:'precio',demo:'demo',features:'features'}[section]}`;
  if(section==='login')return 'https://app.vuelveclub.com/iniciar-sesion';
  if(section==='support')return origin+'/soporte#form-title';
  if(section==='whatsapp')return 'https://wa.me/529992152117';
  if(['customers','card','team'].includes(section)){
    const query=/^org_[A-Za-z0-9]+$/.test(organizationId)?'?'+new URLSearchParams({negocio:organizationId}):'';
    return `https://app.vuelveclub.com/equipo${query}#${{customers:'clientes',card:'tarjeta',team:'equipo'}[section]}`;
  }
  return null;
}

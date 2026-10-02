/* Configuración de Nutrition Club. Edita solo este archivo para cambiar datos de la clínica. */
window.NC_CONFIG={
  whatsapp:'50259518804',
  sheetUrl:'',                 /* URL de la aplicación web de Google Apps Script (ver LEEME.txt). Vacío = modo demo, los registros quedan solo en este navegador. */
  timeZone:'America/Guatemala',
  daysOpen:[1,2,3,4,5],        /* 0=domingo ... 6=sábado */
  blocks:[['08:00','12:00'],['13:00','17:00']], /* horario de ejemplo, ajústalo */
  slotMinutes:30,
  maxDays:60,                  /* cuántos días hacia adelante se puede reservar */
  leadMinutes:60               /* antelación mínima para citas de hoy */
};

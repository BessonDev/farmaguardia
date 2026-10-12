export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: '¿Cómo sé qué farmacias están de turno ahora?',
    a: 'En la parte principal de la página se muestran las farmacia de turno actual con su dirección, teléfono y horario de vigencia. La información se actualiza en tiempo real.',
  },
  {
    q: '¿Cómo reportar una farmacia de turno que no atendió?',
    a: "Haciendo clic en el botón 'Reportar problema' en la tarjeta de la farmacia de turno, seleccionando el tipo de problema y enviando el reporte. Puede agregar detalles opcionales.",
  },
  {
    q: '¿Qué significa que una farmacia tenga turno de 24 horas?',
    a: 'Un turno de 24 horas significa que la farmacia está abierta y atendiendo durante todo el día y noche, típicamente desde las 08:00 de un día hasta las 08:00 del día siguiente.',
  },
  {
    q: '¿Puedo confiar en la información mostrada aquí?',
    a: 'Sí. Los datos provienen directamente de la fuente oficial, el Servicio Autónomo de Contraloría Sanitaria (SACS) Amazonas y se actualizan inmediatamente cuando hay cambios. Además, los usuarios pueden reportar discrepancias para mantener la precisión.',
  },
];

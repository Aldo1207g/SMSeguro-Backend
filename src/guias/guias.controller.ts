import { Controller, Get } from '@nestjs/common';

@Controller('guias')
export class GuiasController {
  @Get()
  obtenerGuias() {
    return [
      {
        id_guia: 1,
        titulo: "Prevención de Smishing Bancario",
        contenido_educativo: "Nunca compartas tu NIP ni contraseñas. Los bancos nunca te pedirán estos datos por SMS o WhatsApp.",
        ejemplo_visual: "Tu cuenta ha sido bloqueada por seguridad. Ingresa a este enlace para recuperarla: http://banco-falso.com"
      },
      {
        id_guia: 2,
        titulo: "Estafas de Paquetería",
        contenido_educativo: "No pagues cuotas aduanales por paquetes que no solicitaste. Verifica directamente en el sitio oficial.",
        ejemplo_visual: "Tu paquete está retenido en aduana. Paga $50 MXN de liberación aquí: http://paqueteria-falsa.com"
      }
    ];
  }
}

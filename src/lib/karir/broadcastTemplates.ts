/**
 * Broadcast WA Templates untuk Manual Notifikasi
 * PPK dapat memilih template dan customize sesuai kebutuhan
 */

export interface BroadcastTemplate {
  id: string;
  title: string;
  icon: string;
  subject: string;
  body: string;
  placeholders: string[];
  allowCustom?: boolean;
}

const FOOTER = `Salam *Kecap Maja.*
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_`;

export const broadcastTemplates: Record<string, BroadcastTemplate> = {
  'informasi-presensi': {
    id: 'informasi-presensi',
    title: '⚠️ Informasi Presensi Pelatihan',
    icon: '⚠️',
    subject: 'Informasi Presensi Pelatihan',
    body: `Halo {nama},

Izin menginformasikan, sehubungan dengan pelaksanaan kegiatan {kegiatan} pada tanggal {tanggal}, bersama ini kami sampaikan bahwa:

Dalam kegiatan tersebut anda tidak perlu melakukan presensi di kantor pada hari yang bersangkutan.

Demikian informasi ini disampaikan.

Atas perhatian dan kerja samanya, kami ucapkan terima kasih

${FOOTER}`,
    placeholders: ['kegiatan', 'tanggal']
  },

  'training-sosialisasi': {
    id: 'training-sosialisasi',
    title: '📚 Undangan Training/Sosialisasi',
    icon: '📚',
    subject: 'Undangan Training/Sosialisasi',
    body: `Halo {nama},

Dengan hormat, kami mengundang Anda untuk mengikuti training/sosialisasi:

{detail}

Silakan segera melakukan pendaftaran dan pastikan Anda dapat hadir.

Atas perhatian Anda, terima kasih.

${FOOTER}`,
    placeholders: ['detail']
  },

  'pengumuman-kebijakan': {
    id: 'pengumuman-kebijakan',
    title: '📢 Pengumuman Kebijakan',
    icon: '📢',
    subject: 'Pengumuman Kebijakan',
    body: `Halo {nama},

Pengumuman Kebijakan tanggal {tanggal}:

{detail}

Pastikan untuk mematuhi kebijakan ini.

${FOOTER}`,
    placeholders: ['tanggal', 'detail']
  },

  'reminder-pengajuan': {
    id: 'reminder-pengajuan',
    title: '🔔 Reminder Pengajuan',
    icon: '🔔',
    subject: 'Reminder Pengajuan',
    body: `Halo {nama},

Reminder: {detail}

Untuk informasi lebih lanjut, silakan hubungi PPK atau kunjungi aplikasi KecakMaja.

${FOOTER}`,
    placeholders: ['detail']
  },

  'pengajuan-dana': {
    id: 'pengajuan-dana',
    title: '💰 Pengajuan Dana/Reimbursement',
    icon: '💰',
    subject: 'Informasi Pengajuan Dana/Reimbursement',
    body: `Halo {nama},

{detail}

Jika ada pertanyaan atau butuh bantuan, segera hubungi bagian keuangan.

Terima kasih.

${FOOTER}`,
    placeholders: ['detail']
  },

  'custom': {
    id: 'custom',
    title: '✍️ Pesan Custom',
    icon: '✍️',
    subject: 'Pesan dari Kecap Maja',
    body: `{custom}

${FOOTER}`,
    placeholders: ['custom'],
    allowCustom: true
  }
};

export function getTemplateById(id: string): BroadcastTemplate | null {
  return broadcastTemplates[id] || null;
}

export function getTemplateList(): BroadcastTemplate[] {
  return Object.values(broadcastTemplates);
}

export function renderMessage(template: BroadcastTemplate, variables: Record<string, string>): string {
  let message = template.body;

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return message;
}

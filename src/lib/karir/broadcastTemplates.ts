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

export const broadcastTemplates: Record<string, BroadcastTemplate> = {
  'informasi-penting': {
    id: 'informasi-penting',
    title: '⚠️ Informasi Penting',
    icon: '⚠️',
    subject: 'Informasi Penting',
    body: `Halo {nama},

Terdapat informasi penting yang perlu Anda ketahui:

{detail}

Mohon untuk membaca dengan seksama dan segera mengambil tindakan jika diperlukan.

Terima kasih atas perhatian Anda.

Salam,
{ppkName}
Pejabat Pembuat Komitmen`,
    placeholders: ['detail']
  },

  'training-sosialisasi': {
    id: 'training-sosialisasi',
    title: '📚 Training/Sosialisasi',
    icon: '📚',
    subject: 'Undangan Training/Sosialisasi',
    body: `Halo {nama},

Dengan hormat, kami mengundang Anda untuk mengikuti training/sosialisasi:

{detail}

Silakan segera melakukan pendaftaran dan pastikan Anda dapat hadir.

Atas perhatian Anda, terima kasih.

Salam,
{ppkName}
Pejabat Pembuat Komitmen`,
    placeholders: ['detail']
  },

  'pengumuman-kebijakan': {
    id: 'pengumuman-kebijakan',
    title: '📢 Pengumuman Kebijakan',
    icon: '📢',
    subject: 'Pengumuman Kebijakan Baru',
    body: `Halo {nama},

Perhatian: Terdapat kebijakan baru yang akan berlaku mulai sekarang:

{detail}

Mohon kesadaran dan keselarasan dalam pelaksanaannya. Jika ada pertanyaan, silakan konsultasi dengan manajemen.

Salam,
{ppkName}
Pejabat Pembuat Komitmen`,
    placeholders: ['detail']
  },

  'reminder-pengajuan': {
    id: 'reminder-pengajuan',
    title: '🔔 Reminder Pengajuan',
    icon: '🔔',
    subject: 'Reminder Pengajuan PAK',
    body: `Halo {nama},

Reminder: Jangan lupa untuk mengajukan PAK/berkas promosi Anda sebelum deadline:

{detail}

Untuk informasi lebih lanjut, silakan hubungi PPK kami atau kunjungi aplikasi KecakMaja.

Salam,
{ppkName}
Pejabat Pembuat Komitmen`,
    placeholders: ['detail']
  },

  'pengajuan-dana': {
    id: 'pengajuan-dana',
    title: '💰 Pengajuan Dana/Reimbursement',
    icon: '💰',
    subject: 'Informasi Pengajuan Dana',
    body: `Halo {nama},

Status pengajuan dana/reimbursement Anda:

{detail}

Jika ada pertanyaan atau butuh bantuan, segera hubungi bagian keuangan.

Terima kasih.

Salam,
{ppkName}
Pejabat Pembuat Komitmen`,
    placeholders: ['detail']
  },

  'custom': {
    id: 'custom',
    title: '✍️ Pesan Custom',
    icon: '✍️',
    subject: 'Pesan dari {ppkName}',
    body: '{custom}',
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

import type { VetService } from '@/types/vet-service';

const at = (daysFromNow: number, hours: number, minutes: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const mockVetServices: VetService[] = [
  {
    id: 'nurse-advice',
    title: { en: 'Healthcare advice', fi: 'Terveysneuvonta', sv: 'Hälsorådgivning' },
    description: {
      en: 'Talk to our vet nurses for advice and to book a vet appointment.',
      fi: 'Kysy neuvoa eläinhoitajaltamme ja varaa aika eläinlääkärille.',
      sv: 'Prata med våra djursjukskötare och boka tid hos veterinär.',
    },
    price: 0,
    icon: 'phone',
    availability: { kind: 'queue', minutes: 5 },
  },
  {
    id: 'prescription-call',
    title: { en: 'Prescription call', fi: 'Reseptipuhelu', sv: 'Receptsamtal' },
    description: {
      en: 'Tick repellent for your dog or cat.',
      fi: 'Punkkikarkote koiralle tai kissalle.',
      sv: 'Fästingmedel för hund eller katt.',
    },
    price: 9,
    icon: 'pill',
    availability: { kind: 'slot', at: at(3, 10, 40) },
  },
  {
    id: 'behaviour-advice',
    title: { en: 'Behaviour advice', fi: 'Käytösneuvonta', sv: 'Beteenderådgivning' },
    description: {
      en: "Get help with your dog or cat's behaviour.",
      fi: 'Apua koiran tai kissan käytökseen.',
      sv: 'Få hjälp med din hunds eller katts beteende.',
    },
    price: 29,
    icon: 'heart',
    availability: { kind: 'slot', at: at(0, 15, 30) },
  },
];

// The demo history's texts in the three app languages. The backend keeps each record in one
// language, like the owner's own entries, so a demo account is seeded in the language the app
// signs in with. The English and Swedish follow the app's mock data (client/src/services/mock).

export const demoLanguages = ["fi", "sv", "en"] as const;
export type DemoLanguage = (typeof demoLanguages)[number];

type DemoTexts = {
  aurora: string;
  kaarina: string;
  vet: string;
  mirri: {
    markings: string;
    annualVisit: string;
    vaccine: string;
    spay: string;
    dentalVisit: string;
    gingivitis: string;
    bloodTitle: string;
    bloodSummary: string;
    urineTitle: string;
    urineSummary: string;
    utiReason: string;
    uti: string;
    antibiotic: string;
    dosage: string;
    findings: string;
    homeCare: [string, string, string];
    followUp: string;
    urinaryFood: string;
    /** The vet's notes; {date} is the follow-up day as "22.10." */
    originalText: string;
  };
  rekku: {
    markings: string;
    registration: string;
    limpReason: string;
    pawInjury: string;
    vaccine: string;
    rabies: string;
    allergen: string;
    xrayTitle: string;
    xraySummary: string;
    ultrasoundTitle: string;
    ultrasoundSummary: string;
    food: string;
  };
};

export const demoTexts: Record<DemoLanguage, DemoTexts> = {
  fi: {
    aurora: "Eläinklinikka Aurora",
    kaarina: "Kaarinan koiraklinikka",
    vet: "ELL Laine",
    mirri: {
      markings: "Harmaa tiikerikuvioinen, valkoinen rinta ja tassut",
      annualVisit: "Vuositarkastus ja rokotukset",
      vaccine: "Kissanflunssa ja kissarutto",
      spay: "Sterilointi",
      dentalVisit: "Hammastarkastus",
      gingivitis: "Lievä ientulehdus",
      bloodTitle: "Verenkuva ja munuaisarvot",
      bloodSummary: "Kaikki arvot viitealueella.",
      urineTitle: "Virtsakoe",
      urineSummary: "Löydettiin bakteereja ja valkosoluja. Ei kiteitä.",
      utiReason: "Tihentynyt virtsaaminen",
      uti: "Virtsatieinfektio",
      antibiotic: "Antibiootti",
      dosage: "1 tabletti 2 kertaa päivässä ruoan kanssa",
      findings:
        "Mirrin virtsassa on bakteereja, jotka ärsyttävät virtsarakkoa. Siksi hän käy laatikolla usein ja virtsaa vain vähän kerrallaan.",
      homeCare: [
        "Anna antibioottia aamuin illoin 10 päivän ajan, vaikka vointi paranisi aiemmin.",
        "Tue juomista: raikasta vettä useaan paikkaan ja märkäruokaa.",
        "Kirjaa juominen, laatikkokäynnit ja ponnistelu päivittäin.",
      ],
      followUp: "Kontrollikäynti ja virtsanäyte",
      urinaryFood: "Virtsateitä tukeva märkäruoka",
      originalText:
        "Dg: bakteerikystiitti. Virtsan liuskakoe: leuk +++, ery ++, nitriitti +. Sedimentti: bakteereja, ei kiteitä. Hoito: amoksisilliini/klavulaanihappo 50 mg 1x2 p.o. 10 vrk. Märkä virtsatieruokavalio, lisää juomista. Kontrolli {date} jos ei paranemista.",
    },
    rekku: {
      markings: "Keltainen, lyhytkarvainen",
      registration: "FI28417/21 · Suomen Kennelliitto",
      limpReason: "Ontuminen vasen etujalka",
      pawInjury: "Anturavamma, ei murtumaa",
      vaccine: "Penikkatauti, parvo ja hepatiitti",
      rabies: "Raivotauti",
      allergen: "Kanaproteiini",
      xrayTitle: "Röntgen, vasen etutassu",
      xraySummary: "Ei murtumaa. Vain pehmytkudosvamma.",
      ultrasoundTitle: "Vatsan ultraääni",
      ultrasoundSummary: "Normaalit löydökset. Tutkittiin vatsavaivojen vuoksi.",
      food: "Kanaton aikuisen koiran ruoka",
    },
  },
  sv: {
    aurora: "Djurkliniken Aurora",
    kaarina: "S:t Karins hundklinik",
    vet: "Vet. med. Laine",
    mirri: {
      markings: "Grå tigrerad, vitt bröst och vita tassar",
      annualVisit: "Årlig hälsokontroll och vaccinationer",
      vaccine: "Kattsnuva och kattpest",
      spay: "Kastrering",
      dentalVisit: "Tandkontroll",
      gingivitis: "Lindrig tandköttsinflammation",
      bloodTitle: "Blodstatus och njurvärden",
      bloodSummary: "Alla värden inom referensområdet.",
      urineTitle: "Urinprov",
      urineSummary: "Bakterier och vita blodkroppar hittades. Inga kristaller.",
      utiReason: "Täta urineringar",
      uti: "Urinvägsinfektion",
      antibiotic: "Antibiotika",
      dosage: "1 tablett 2 gånger om dagen med mat",
      findings:
        "Bakterier i Mirris urin irriterar urinblåsan. Därför går hon ofta på lådan och kissar bara lite åt gången.",
      homeCare: [
        "Ge antibiotikan morgon och kväll i 10 dagar, även om hon verkar må bättre.",
        "Hjälp henne att dricka: färskt vatten på flera ställen och våtfoder.",
        "Logga drickande, besök i lådan och krystningar varje dag.",
      ],
      followUp: "Återbesök och urinprov",
      urinaryFood: "Våtfoder för urinvägarna",
      originalText:
        "Dg: bakteriell cystit. Urinstickor: leuk +++, ery ++, nitrit +. Sediment: bakterier, inga kristaller. Beh: amoxicillin/klavulansyra 50 mg 1x2 p.o. 10 d. Vått urinvägsfoder, öka vattenintaget. Kontroll {date} om ingen förbättring.",
    },
    rekku: {
      markings: "Gul, korthårig",
      registration: "FI28417/21 · Finska Kennelklubben",
      limpReason: "Hälta vänster framben",
      pawInjury: "Trampdynsskada, ingen fraktur",
      vaccine: "Valpsjuka, parvo och hepatit",
      rabies: "Rabies",
      allergen: "Kycklingprotein",
      xrayTitle: "Röntgen, vänster framtass",
      xraySummary: "Ingen fraktur. Endast mjukdelsskada.",
      ultrasoundTitle: "Ultraljud av buken",
      ultrasoundSummary: "Normala fynd. Undersöktes på grund av magbesvär.",
      food: "Kycklingfritt foder för vuxna hundar",
    },
  },
  en: {
    aurora: "Pet Clinic Aurora",
    kaarina: "Kaarina Dog Clinic",
    vet: "Dr. Laine",
    mirri: {
      markings: "Grey tabby, white chest and paws",
      annualVisit: "Annual check-up & vaccines",
      vaccine: "Cat flu & panleukopenia",
      spay: "Spaying",
      dentalVisit: "Dental check-up",
      gingivitis: "Mild gingivitis",
      bloodTitle: "Blood count and kidney values",
      bloodSummary: "All values within normal range.",
      urineTitle: "Urine test",
      urineSummary: "Bacteria and white blood cells found. No crystals.",
      utiReason: "Frequent urination",
      uti: "Urinary tract infection",
      antibiotic: "Antibiotic",
      dosage: "1 tablet twice a day with food",
      findings:
        "Bacteria in Mirri's urine are irritating her bladder. That is why she visits the litter box often and passes only small amounts.",
      homeCare: [
        "Give the antibiotic morning and evening for 10 days, even if she seems better.",
        "Help her drink: fresh water in several places, and wet food.",
        "Log water, litter box trips and straining every day.",
      ],
      followUp: "Check-up and urine test",
      urinaryFood: "Urinary care wet food",
      originalText:
        "Dx: bacterial cystitis. Urine sticks: leuk +++, ery ++, nitrite +. Sediment: bacteria, no crystals. Tx: amoxicillin/clavulanate 50 mg 1x2 p.o. 10 d. Wet urinary diet, increase water intake. Control {date} if no improvement.",
    },
    rekku: {
      markings: "Yellow, short coat",
      registration: "FI28417/21 · Finnish Kennel Club",
      limpReason: "Limping, front left leg",
      pawInjury: "Paw pad injury, no fracture",
      vaccine: "Distemper, parvo & hepatitis",
      rabies: "Rabies",
      allergen: "Chicken protein",
      xrayTitle: "X-ray, front left paw",
      xraySummary: "No fracture. Soft tissue injury only.",
      ultrasoundTitle: "Abdominal ultrasound",
      ultrasoundSummary: "Normal findings. Checked because of an upset stomach.",
      food: "Chicken-free adult dog food",
    },
  },
};

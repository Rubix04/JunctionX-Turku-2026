import type { EmergencySign, FirstAidTopic } from '@/types/first-aid';

// First aid guides (spec 6, stage 2). Sample content for the prototype: a vet or an
// animal first aid trainer must create or review every guide before release.

export const mockFirstAidTopics: FirstAidTopic[] = [
  {
    id: 'cpr',
    icon: 'heartPulse',
    title: { en: 'Resuscitation (CPR)', fi: 'Elvytys', sv: 'Hjärt-lungräddning' },
    when: {
      en: 'Not breathing and not responding',
      fi: 'Ei hengitä eikä reagoi',
      sv: 'Andas inte och reagerar inte',
    },
    steps: [
      {
        text: {
          en: 'Check: does your pet respond to its name or a touch? Look at the chest for 10 seconds to see if it breathes.',
          fi: 'Tarkista: reagoiko lemmikki nimeen tai kosketukseen? Katso rintakehää 10 sekuntia: hengittääkö se?',
          sv: 'Kontrollera: reagerar djuret på sitt namn eller beröring? Titta på bröstkorgen i 10 sekunder: andas det?',
        },
      },
      {
        text: {
          en: 'Ask someone to call the emergency clinic now while you start. Put your pet on its right side on a firm surface.',
          fi: 'Pyydä jotakuta soittamaan päivystykseen heti, kun aloitat. Aseta lemmikki oikealle kyljelleen tukevalle alustalle.',
          sv: 'Be någon ringa jouren direkt medan du börjar. Lägg djuret på höger sida på ett fast underlag.',
        },
      },
      {
        text: {
          en: 'Press hard and fast on the widest part of the chest, compressing it by a third. Let it rise fully between presses.',
          fi: 'Paina lujaa ja nopeasti rintakehän leveimmästä kohdasta noin kolmannes sen syvyydestä. Anna rintakehän palautua painallusten välissä.',
          sv: 'Tryck hårt och snabbt på bröstkorgens bredaste del så att den trycks ihop en tredjedel. Låt den återgå helt mellan trycken.',
        },
        bySize: {
          cat: {
            en: 'Hold the chest behind the front legs with one hand, thumb on one side and fingers on the other, and squeeze by a third.',
            fi: 'Ota yhdellä kädellä kiinni rintakehästä etujalkojen takaa, peukalo toisella ja sormet toisella puolella, ja purista kolmannes.',
            sv: 'Håll om bröstkorgen bakom frambenen med en hand, tummen på ena sidan och fingrarna på den andra, och kläm ihop en tredjedel.',
          },
          smallDog: {
            en: 'Hold the chest behind the front legs with one hand, or press with the heel of one hand over the heart, by a third.',
            fi: 'Ota yhdellä kädellä kiinni rintakehästä etujalkojen takaa tai paina yhden käden kämmenpohjalla sydämen kohdalta kolmannes.',
            sv: 'Håll om bröstkorgen bakom frambenen med en hand, eller tryck med ena handflatan över hjärtat, en tredjedel.',
          },
          largeDog: {
            en: 'Lock both hands, one on top of the other, over the widest part of the chest. Keep your arms straight and press by a third.',
            fi: 'Aseta kädet päällekkäin rintakehän leveimmän kohdan päälle. Pidä kädet suorina ja paina kolmannes.',
            sv: 'Lägg händerna ovanpå varandra över bröstkorgens bredaste del. Håll armarna raka och tryck en tredjedel.',
          },
        },
      },
      {
        text: {
          en: 'After 30 presses, close the mouth, breathe into the nose twice until the chest rises. Then continue with 30 presses.',
          fi: '30 painalluksen jälkeen sulje suu ja puhalla kahdesti sieraimiin, kunnes rintakehä nousee. Jatka sitten 30 painalluksella.',
          sv: 'Efter 30 tryck, stäng munnen och blås två gånger in i nosen tills bröstkorgen höjs. Fortsätt sedan med 30 tryck.',
        },
      },
      {
        text: {
          en: 'Keep going on the way to the vet. Check for breathing every 2 minutes.',
          fi: 'Jatka matkalla eläinlääkäriin. Tarkista hengitys 2 minuutin välein.',
          sv: 'Fortsätt på vägen till veterinären. Kontrollera andningen varannan minut.',
        },
      },
    ],
    rhythmBpm: 110,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'choking',
    icon: 'wind',
    title: { en: 'Choking', fi: 'Tukehtuminen', sv: 'Kvävning' },
    when: {
      en: 'Something stuck in the throat, gagging, pawing at the mouth',
      fi: 'Jotain juuttunut kurkkuun, yökkäily, suun raapiminen',
      sv: 'Något fast i halsen, kväljningar, krafsar på munnen',
    },
    steps: [
      {
        text: {
          en: 'Stay calm. Open the mouth and look. Remove the object only if you can see and grab it easily. Do not push it deeper.',
          fi: 'Pysy rauhallisena. Avaa suu ja katso. Poista esine vain, jos näet sen ja saat siitä helposti kiinni. Älä työnnä sitä syvemmälle.',
          sv: 'Håll dig lugn. Öppna munnen och titta. Ta bort föremålet bara om du ser det och lätt får tag i det. Tryck inte in det djupare.',
        },
      },
      {
        text: {
          en: 'If it does not come out, use the Heimlich maneuver.',
          fi: 'Jos esine ei irtoa, käytä Heimlichin otetta.',
          sv: 'Om det inte lossnar, använd Heimlichmanövern.',
        },
        bySize: {
          cat: {
            en: 'Hold your cat with its back against your chest, head up. Place a fist just below the ribs and push in and up 5 times.',
            fi: 'Pidä kissaa selkä rintaasi vasten pää ylöspäin. Aseta nyrkki kylkiluiden alapuolelle ja työnnä sisään ja ylös 5 kertaa.',
            sv: 'Håll katten med ryggen mot ditt bröst, huvudet uppåt. Lägg en knytnäve strax under revbenen och tryck in och upp 5 gånger.',
          },
          smallDog: {
            en: 'Hold your dog with its back against your chest, head up. Place a fist just below the ribs and push in and up 5 times.',
            fi: 'Pidä koiraa selkä rintaasi vasten pää ylöspäin. Aseta nyrkki kylkiluiden alapuolelle ja työnnä sisään ja ylös 5 kertaa.',
            sv: 'Håll hunden med ryggen mot ditt bröst, huvudet uppåt. Lägg en knytnäve strax under revbenen och tryck in och upp 5 gånger.',
          },
          largeDog: {
            en: 'Stand behind your dog, lift the hind legs like a wheelbarrow or put your arms around the belly, and thrust in and up under the ribs 5 times.',
            fi: 'Seiso koiran takana, nosta takajalat kottikärryasentoon tai kiedo kädet vatsan ympäri ja työnnä kylkiluiden alta sisään ja ylös 5 kertaa.',
            sv: 'Stå bakom hunden, lyft bakbenen som en skottkärra eller lägg armarna runt magen och stöt in och upp under revbenen 5 gånger.',
          },
        },
      },
      {
        text: {
          en: 'Check the mouth again. Repeat until the object comes out, and go to a vet even if your pet seems fine.',
          fi: 'Tarkista suu uudelleen. Toista, kunnes esine tulee ulos, ja mene eläinlääkäriin, vaikka lemmikki vaikuttaisi voivan hyvin.',
          sv: 'Kontrollera munnen igen. Upprepa tills föremålet kommer ut, och åk till veterinären även om djuret verkar må bra.',
        },
      },
      {
        text: {
          en: 'If your pet stops breathing, start CPR.',
          fi: 'Jos lemmikki lakkaa hengittämästä, aloita elvytys.',
          sv: 'Om djuret slutar andas, börja med hjärt-lungräddning.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'bleeding',
    icon: 'droplet',
    title: { en: 'Heavy bleeding', fi: 'Runsas verenvuoto', sv: 'Kraftig blödning' },
    when: { en: 'Blood is flowing or spurting', fi: 'Veri valuu tai suihkuaa', sv: 'Blodet rinner eller sprutar' },
    steps: [
      {
        text: {
          en: 'Press a clean cloth or bandage firmly on the wound. Do not lift it to look.',
          fi: 'Paina puhdasta liinaa tai sidettä tiukasti haavaa vasten. Älä nosta sitä katsoaksesi.',
          sv: 'Tryck en ren duk eller ett förband hårt mot såret. Lyft inte för att titta.',
        },
      },
      {
        text: {
          en: 'If blood soaks through, add more layers on top and keep pressing.',
          fi: 'Jos veri tulee läpi, lisää kerroksia päälle ja jatka painamista.',
          sv: 'Om blodet tränger igenom, lägg fler lager ovanpå och fortsätt trycka.',
        },
      },
      {
        text: {
          en: 'Wrap a bandage around a leg wound firmly, but not so tight that the paw turns cold.',
          fi: 'Sido jalan haava tukevasti, mutta ei niin tiukalle, että tassu kylmenee.',
          sv: 'Linda ett förband runt ett sår på benet ordentligt, men inte så hårt att tassen blir kall.',
        },
      },
      {
        text: {
          en: 'Keep your pet warm and still, and go to the emergency clinic now.',
          fi: 'Pidä lemmikki lämpimänä ja paikallaan ja lähde heti päivystykseen.',
          sv: 'Håll djuret varmt och stilla och åk till jouren direkt.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'heatstroke',
    icon: 'thermometer',
    title: { en: 'Heatstroke', fi: 'Lämpöhalvaus', sv: 'Värmeslag' },
    when: {
      en: 'Heavy panting, drooling, staggering in the heat',
      fi: 'Voimakas läähätys, kuolaaminen, horjuminen kuumassa',
      sv: 'Kraftig flämtning, dregling, vinglighet i värmen',
    },
    steps: [
      {
        text: {
          en: 'Move your pet to shade or a cool room right away.',
          fi: 'Siirrä lemmikki heti varjoon tai viileään huoneeseen.',
          sv: 'Flytta djuret till skugga eller ett svalt rum direkt.',
        },
      },
      {
        text: {
          en: 'Wet the coat with cool, not ice-cold, water. Focus on the belly, armpits and paws. Use a fan if you have one.',
          fi: 'Kastele turkki viileällä, ei jääkylmällä, vedellä. Keskity vatsaan, kainaloihin ja tassuihin. Käytä tuuletinta, jos sellainen on.',
          sv: 'Blöt pälsen med svalt, inte iskallt, vatten. Fokusera på magen, armhålorna och tassarna. Använd en fläkt om du har en.',
        },
      },
      {
        text: {
          en: 'Offer small sips of water. Do not force it to drink.',
          fi: 'Tarjoa pieniä määriä vettä. Älä pakota juomaan.',
          sv: 'Erbjud små klunkar vatten. Tvinga inte djuret att dricka.',
        },
      },
      {
        text: {
          en: 'Go to a vet even if your pet seems better. Keep cooling on the way.',
          fi: 'Mene eläinlääkäriin, vaikka lemmikki vaikuttaisi paremmalta. Jatka viilentämistä matkalla.',
          sv: 'Åk till veterinären även om djuret verkar bättre. Fortsätt kyla på vägen.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'seizure',
    icon: 'bolt',
    title: { en: 'Seizures', fi: 'Kouristukset', sv: 'Kramper' },
    when: {
      en: 'Shaking, paddling legs, not responding',
      fi: 'Nykiminen, jalkojen polkeminen, ei reagoi',
      sv: 'Skakningar, paddlande ben, reagerar inte',
    },
    steps: [
      {
        text: {
          en: 'Stay calm and note the time. Move furniture and sharp objects away.',
          fi: 'Pysy rauhallisena ja katso kello. Siirrä huonekalut ja terävät esineet pois.',
          sv: 'Håll dig lugn och notera tiden. Flytta bort möbler och vassa föremål.',
        },
      },
      {
        text: {
          en: 'Do not hold your pet down and never put your hand in its mouth.',
          fi: 'Älä pidä lemmikkiä väkisin paikallaan äläkä koskaan laita kättä sen suuhun.',
          sv: 'Håll inte fast djuret och stoppa aldrig handen i dess mun.',
        },
      },
      {
        text: {
          en: 'Dim the lights and keep the room quiet. Film the seizure for the vet if you can.',
          fi: 'Himmennä valot ja pidä huone hiljaisena. Kuvaa kohtaus eläinlääkärille, jos pystyt.',
          sv: 'Dämpa ljuset och håll rummet tyst. Filma anfallet åt veterinären om du kan.',
        },
      },
      {
        text: {
          en: 'If it lasts over 5 minutes or a new seizure starts, go to the emergency clinic now.',
          fi: 'Jos kohtaus kestää yli 5 minuuttia tai uusi alkaa, lähde heti päivystykseen.',
          sv: 'Om anfallet varar över 5 minuter eller ett nytt börjar, åk till jouren direkt.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'poisoning',
    icon: 'flask',
    title: { en: 'Suspected poisoning', fi: 'Epäilty myrkytys', sv: 'Misstänkt förgiftning' },
    when: {
      en: 'Ate or licked something dangerous',
      fi: 'Söi tai nuoli jotain vaarallista',
      sv: 'Åt eller slickade på något farligt',
    },
    steps: [
      {
        text: {
          en: 'Move the rest out of reach and keep the packaging or a sample.',
          fi: 'Siirrä loput pois ulottuvilta ja ota pakkaus tai näyte talteen.',
          sv: 'Flytta resten utom räckhåll och spara förpackningen eller ett prov.',
        },
      },
      {
        text: {
          en: "Do not make your pet vomit unless a vet tells you to. It can make things worse.",
          fi: 'Älä oksennuta lemmikkiä, ellei eläinlääkäri neuvo. Se voi pahentaa tilannetta.',
          sv: 'Framkalla inte kräkning om inte veterinären säger det. Det kan förvärra läget.',
        },
      },
      {
        text: {
          en: 'Call the emergency clinic. Tell them what, how much and when, and your pet’s weight.',
          fi: 'Soita päivystykseen. Kerro mitä, kuinka paljon ja milloin sekä lemmikin paino.',
          sv: 'Ring jouren. Berätta vad, hur mycket och när, samt djurets vikt.',
        },
      },
      {
        text: {
          en: 'If the poison is on the skin or coat, rinse it off with lukewarm water.',
          fi: 'Jos myrkkyä on iholla tai turkissa, huuhtele se haalealla vedellä.',
          sv: 'Om giftet finns på huden eller pälsen, skölj bort det med ljummet vatten.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'snakebite',
    icon: 'snake',
    title: { en: 'Adder bite', fi: 'Kyyn purema', sv: 'Huggormsbett' },
    when: {
      en: 'Sudden swelling, often on the face or a leg',
      fi: 'Äkillinen turvotus, usein kasvoissa tai jalassa',
      sv: 'Plötslig svullnad, ofta i ansiktet eller på ett ben',
    },
    steps: [
      {
        text: {
          en: 'Keep your pet as still and calm as possible. Carry it if you can.',
          fi: 'Pidä lemmikki mahdollisimman rauhallisena ja paikallaan. Kanna se, jos pystyt.',
          sv: 'Håll djuret så stilla och lugnt som möjligt. Bär det om du kan.',
        },
      },
      {
        text: {
          en: 'Remove the collar if the bite is on the head or neck, because of swelling.',
          fi: 'Poista kaulapanta, jos purema on päässä tai kaulassa, turvotuksen vuoksi.',
          sv: 'Ta av halsbandet om bettet är på huvudet eller halsen, på grund av svullnaden.',
        },
      },
      {
        text: {
          en: 'Do not cut, suck or bind the bite. You can cool it gently with a cloth.',
          fi: 'Älä viillä, ime tai sido puremaa. Voit viilentää sitä varovasti liinalla.',
          sv: 'Skär inte, sug inte och bind inte bettet. Du kan kyla det försiktigt med en duk.',
        },
      },
      {
        text: {
          en: 'Go to a vet now and call ahead on the way.',
          fi: 'Lähde heti eläinlääkäriin ja soita matkalla etukäteen.',
          sv: 'Åk till veterinären direkt och ring i förväg på vägen.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
  {
    id: 'carAccident',
    icon: 'car',
    title: { en: 'Hit by a car', fi: 'Auton alle jääminen', sv: 'Påkörd av bil' },
    when: {
      en: 'After a traffic accident, even if it seems fine',
      fi: 'Liikenneonnettomuuden jälkeen, vaikka vaikuttaisi kunnossa olevalta',
      sv: 'Efter en trafikolycka, även om djuret verkar oskadat',
    },
    steps: [
      {
        text: {
          en: 'Make sure you are safe from traffic first.',
          fi: 'Varmista ensin oma turvallisuutesi liikenteessä.',
          sv: 'Se först till att du själv är säker från trafiken.',
        },
      },
      {
        text: {
          en: 'A hurt animal may bite. Approach slowly and cover the head with a jacket if needed.',
          fi: 'Loukkaantunut eläin voi purra. Lähesty rauhallisesti ja peitä pää tarvittaessa takilla.',
          sv: 'Ett skadat djur kan bita. Närma dig lugnt och täck huvudet med en jacka vid behov.',
        },
      },
      {
        text: {
          en: 'Slide your pet onto a coat or board and keep its back straight while moving it.',
          fi: 'Liu’uta lemmikki takin tai laudan päälle ja pidä selkä suorana siirron aikana.',
          sv: 'Låt djuret glida upp på en jacka eller en skiva och håll ryggen rak när du flyttar det.',
        },
      },
      {
        text: {
          en: 'Press on any bleeding, keep it warm and go to the emergency clinic now.',
          fi: 'Paina mahdollista verenvuotoa, pidä lämpimänä ja lähde heti päivystykseen.',
          sv: 'Tryck på eventuella blödningar, håll djuret varmt och åk till jouren direkt.',
        },
      },
    ],
    rhythmBpm: null,
    updatedOn: '2026-10-10',
    reviewed: false,
  },
];

// The emergency list from spec 1: always one tap away.
export const mockEmergencySigns: EmergencySign[] = [
  {
    id: 'notBreathing',
    label: { en: 'Not breathing or no heartbeat', fi: 'Ei hengitä tai syke puuttuu', sv: 'Andas inte eller ingen puls' },
    topicId: 'cpr',
  },
  {
    id: 'breathing',
    label: { en: 'Struggling to breathe or choking', fi: 'Hengitysvaikeus tai tukehtuminen', sv: 'Andningssvårigheter eller kvävning' },
    topicId: 'choking',
  },
  {
    id: 'seizure',
    label: { en: 'Seizure', fi: 'Kouristuskohtaus', sv: 'Krampanfall' },
    topicId: 'seizure',
  },
  {
    id: 'poison',
    label: { en: 'Ate something poisonous', fi: 'Söi jotain myrkyllistä', sv: 'Åt något giftigt' },
    topicId: 'poisoning',
  },
  {
    id: 'bleeding',
    label: { en: 'Heavy bleeding', fi: 'Runsas verenvuoto', sv: 'Kraftig blödning' },
    topicId: 'bleeding',
  },
  {
    id: 'heat',
    label: { en: 'Overheated, staggering', fi: 'Ylikuumentunut, horjuu', sv: 'Överhettad, vinglar' },
    topicId: 'heatstroke',
  },
  {
    id: 'trauma',
    label: { en: 'Hit by a car or fell', fi: 'Jäi auton alle tai putosi', sv: 'Påkörd eller föll' },
    topicId: 'carAccident',
  },
  {
    id: 'urine',
    label: {
      en: 'Strains but passes no urine',
      fi: 'Ponnistaa mutta virtsaa ei tule',
      sv: 'Krystar men ingen urin kommer',
    },
    topicId: null,
  },
  {
    id: 'belly',
    label: {
      en: 'Swollen, hard belly with retching',
      fi: 'Turvonnut, kova vatsa ja yökkäily',
      sv: 'Svullen, hård buk och kväljningar',
    },
    topicId: null,
  },
  {
    id: 'gums',
    label: { en: 'Pale, blue or grey gums', fi: 'Kalpeat, siniset tai harmaat ikenet', sv: 'Bleka, blå eller grå tandkött' },
    topicId: null,
  },
];

import type { Quiz } from '@/types/quiz';

export const mockQuizzes: Quiz[] = [
  {
    id: 'chocolate',
    title: { en: 'Chocolate and dogs', fi: 'Suklaa ja koirat', sv: 'Choklad och hundar' },
    summary: {
      en: 'What to do when your dog has eaten chocolate.',
      fi: 'Mitä tehdä, kun koira on syönyt suklaata.',
      sv: 'Vad du gör när hunden har ätit choklad.',
    },
    icon: 'alertTriangle',
    species: ['dog'],
    substanceId: 'chocolate',
    lesson: [
      {
        en: 'Chocolate contains theobromine, which dogs break down very slowly.',
        fi: 'Suklaassa on teobromiinia, jota koira hajottaa hyvin hitaasti.',
        sv: 'Choklad innehåller teobromin, som hundar bryter ner mycket långsamt.',
      },
      {
        en: 'The darker the chocolate, the more dangerous. Baking chocolate is the worst.',
        fi: 'Mitä tummempaa suklaa, sitä vaarallisempaa. Leivontasuklaa on pahinta.',
        sv: 'Ju mörkare choklad, desto farligare. Bakchoklad är värst.',
      },
      {
        en: 'Symptoms such as vomiting, restlessness and a fast heartbeat can start 2–12 hours later.',
        fi: 'Oireet, kuten oksentelu, levottomuus ja nopea syke, voivat alkaa 2–12 tunnin kuluttua.',
        sv: 'Symtom som kräkningar, oro och snabb puls kan komma 2–12 timmar senare.',
      },
      {
        en: 'Call a vet straight away. Never make your dog vomit at home.',
        fi: 'Soita heti eläinlääkärille. Älä koskaan oksennuta koiraa kotona.',
        sv: 'Ring en veterinär direkt. Framkalla aldrig kräkning hemma.',
      },
    ],
    questions: [
      {
        id: 'first-step',
        prompt: {
          en: 'Your dog has just eaten a bar of dark chocolate. What do you do first?',
          fi: 'Koirasi on juuri syönyt levyn tummaa suklaata. Mitä teet ensin?',
          sv: 'Din hund har precis ätit en kaka mörk choklad. Vad gör du först?',
        },
        options: [
          { en: 'Wait and see if symptoms appear', fi: 'Odotan, tuleeko oireita', sv: 'Väntar och ser om symtom kommer' },
          {
            en: 'Call a vet right away and say what and how much it ate',
            fi: 'Soitan heti eläinlääkärille ja kerron, mitä ja kuinka paljon se söi',
            sv: 'Ringer en veterinär direkt och berättar vad och hur mycket den åt',
          },
          {
            en: 'Give salt water to make it vomit',
            fi: 'Annan suolavettä, jotta se oksentaisi',
            sv: 'Ger saltvatten så att den kräks',
          },
          { en: 'Give milk to dilute it', fi: 'Annan maitoa laimentamaan', sv: 'Ger mjölk för att späda ut' },
        ],
        answer: 1,
        explanation: {
          en: 'Treatment works best in the first couple of hours. The vet works out the risk from the type, amount and your dog’s weight. Salt water can itself poison a dog.',
          fi: 'Hoito tehoaa parhaiten parin ensimmäisen tunnin aikana. Eläinlääkäri arvioi riskin suklaan laadun, määrän ja koiran painon perusteella. Suolavesi voi itsessään myrkyttää koiran.',
          sv: 'Behandlingen fungerar bäst de första timmarna. Veterinären bedömer risken utifrån sort, mängd och hundens vikt. Saltvatten kan i sig förgifta en hund.',
        },
      },
      {
        id: 'most-dangerous',
        prompt: {
          en: 'Which chocolate is the most dangerous for a dog?',
          fi: 'Mikä suklaa on koiralle vaarallisinta?',
          sv: 'Vilken choklad är farligast för en hund?',
        },
        options: [
          { en: 'Milk chocolate', fi: 'Maitosuklaa', sv: 'Mjölkchoklad' },
          { en: 'White chocolate', fi: 'Valkosuklaa', sv: 'Vit choklad' },
          { en: 'Dark baking chocolate', fi: 'Tumma leivontasuklaa', sv: 'Mörk bakchoklad' },
        ],
        answer: 2,
        explanation: {
          en: 'More cocoa means more theobromine. Baking chocolate can be many times stronger than milk chocolate, so even a small piece can be dangerous for a small dog.',
          fi: 'Mitä enemmän kaakaota, sitä enemmän teobromiinia. Leivontasuklaa voi olla moninkertaisesti vahvempaa kuin maitosuklaa, joten pienikin pala voi olla vaarallinen pienelle koiralle.',
          sv: 'Mer kakao betyder mer teobromin. Bakchoklad kan vara många gånger starkare än mjölkchoklad, så även en liten bit kan vara farlig för en liten hund.',
        },
      },
      {
        id: 'when-symptoms',
        prompt: {
          en: 'An hour later your dog seems completely fine. Is the danger over?',
          fi: 'Tunnin päästä koira vaikuttaa täysin terveeltä. Onko vaara ohi?',
          sv: 'En timme senare verkar hunden helt pigg. Är faran över?',
        },
        options: [
          { en: 'Yes, symptoms would have shown by now', fi: 'Kyllä, oireet näkyisivät jo', sv: 'Ja, symtomen skulle ha synts nu' },
          {
            en: 'No, symptoms can start up to 12 hours later',
            fi: 'Ei, oireet voivat alkaa jopa 12 tunnin kuluttua',
            sv: 'Nej, symtom kan komma upp till 12 timmar senare',
          },
        ],
        answer: 1,
        explanation: {
          en: 'Theobromine is absorbed slowly. Feeling fine at first does not mean your dog is safe, so follow the vet’s advice even without symptoms.',
          fi: 'Teobromiini imeytyy hitaasti. Hyvä vointi aluksi ei tarkoita, että koira on turvassa, joten noudata eläinlääkärin ohjeita oireettomanakin.',
          sv: 'Teobromin tas upp långsamt. Att hunden mår bra i början betyder inte att den är utom fara, så följ veterinärens råd även utan symtom.',
        },
      },
      {
        id: 'tell-vet',
        prompt: {
          en: 'What is most useful to tell the vet on the phone?',
          fi: 'Mikä on hyödyllisintä kertoa eläinlääkärille puhelimessa?',
          sv: 'Vad är mest användbart att berätta för veterinären i telefon?',
        },
        options: [
          { en: 'Just that the dog ate something', fi: 'Vain että koira söi jotain', sv: 'Bara att hunden åt något' },
          {
            en: 'The type of chocolate, how much, when, and the dog’s weight',
            fi: 'Suklaan laatu, määrä, ajankohta ja koiran paino',
            sv: 'Sorts choklad, hur mycket, när och hundens vikt',
          },
          { en: 'What the dog usually eats', fi: 'Mitä koira yleensä syö', sv: 'Vad hunden brukar äta' },
        ],
        answer: 1,
        explanation: {
          en: 'These four facts let the vet calculate the dose per kilo and decide whether your dog needs treatment now. Keep the wrapper if you can.',
          fi: 'Näiden neljän tiedon avulla eläinlääkäri laskee annoksen painokiloa kohden ja päättää, tarvitaanko hoitoa heti. Säästä kääre, jos voit.',
          sv: 'Med de här fyra uppgifterna kan veterinären räkna ut dosen per kilo och avgöra om hunden behöver behandling nu. Spara omslaget om du kan.',
        },
      },
    ],
  },
  {
    id: 'lilies',
    title: { en: 'Lilies and cats', fi: 'Liljat ja kissat', sv: 'Liljor och katter' },
    summary: {
      en: 'Why a single lily can harm your cat’s kidneys.',
      fi: 'Miksi yksikin lilja voi vahingoittaa kissan munuaisia.',
      sv: 'Varför en enda lilja kan skada kattens njurar.',
    },
    icon: 'sprout',
    species: ['cat'],
    substanceId: 'lilies',
    lesson: [
      {
        en: 'Every part of a lily is toxic to cats: flowers, leaves, pollen and even the vase water.',
        fi: 'Liljan kaikki osat ovat kissalle myrkyllisiä: kukat, lehdet, siitepöly ja jopa maljakon vesi.',
        sv: 'Alla delar av en lilja är giftiga för katter: blommor, blad, pollen och till och med vasvattnet.',
      },
      {
        en: 'A tiny amount can cause kidney failure within 1–3 days.',
        fi: 'Pienikin määrä voi aiheuttaa munuaisten vajaatoiminnan 1–3 päivässä.',
        sv: 'En liten mängd kan ge njursvikt inom 1–3 dagar.',
      },
      {
        en: 'Early treatment with fluids protects the kidneys, so go to a vet even if your cat seems well.',
        fi: 'Varhainen nesteytys suojaa munuaisia, joten mene eläinlääkäriin, vaikka kissa vaikuttaisi terveeltä.',
        sv: 'Tidig behandling med vätska skyddar njurarna, så åk till veterinären även om katten verkar pigg.',
      },
    ],
    questions: [
      {
        id: 'pollen',
        prompt: {
          en: 'Your cat has lily pollen on its fur. What do you do?',
          fi: 'Kissan turkissa on liljan siitepölyä. Mitä teet?',
          sv: 'Din katt har liljepollen i pälsen. Vad gör du?',
        },
        options: [
          { en: 'Let the cat groom it off', fi: 'Annan kissan nuolla sen pois', sv: 'Låter katten tvätta bort det' },
          {
            en: 'Wash it off before the cat licks it, then call a vet',
            fi: 'Pesen sen pois ennen kuin kissa nuolee sitä ja soitan eläinlääkärille',
            sv: 'Tvättar bort det innan katten slickar och ringer en veterinär',
          },
          { en: 'Nothing, pollen is harmless', fi: 'En mitään, siitepöly on vaaratonta', sv: 'Inget, pollen är ofarligt' },
        ],
        answer: 1,
        explanation: {
          en: 'Licking the pollen off is enough to poison a cat. Wash it off with mild soap and water and ask a vet whether your cat needs to come in.',
          fi: 'Siitepölyn nuoleminen riittää myrkyttämään kissan. Pese se miedolla saippualla ja vedellä ja kysy eläinlääkäriltä, pitääkö kissa tuoda vastaanotolle.',
          sv: 'Att slicka i sig pollen räcker för att förgifta en katt. Tvätta bort det med mild tvål och vatten och fråga veterinären om katten behöver komma in.',
        },
      },
      {
        id: 'which-parts',
        prompt: {
          en: 'Which parts of a lily are toxic to cats?',
          fi: 'Mitkä liljan osat ovat kissalle myrkyllisiä?',
          sv: 'Vilka delar av en lilja är giftiga för katter?',
        },
        options: [
          { en: 'Only the flowers', fi: 'Vain kukat', sv: 'Bara blommorna' },
          { en: 'Only the leaves', fi: 'Vain lehdet', sv: 'Bara bladen' },
          {
            en: 'All parts, including pollen and vase water',
            fi: 'Kaikki osat, myös siitepöly ja maljakon vesi',
            sv: 'Alla delar, även pollen och vasvatten',
          },
        ],
        answer: 2,
        explanation: {
          en: 'The toxin is in the whole plant. The safest choice is to keep lilies out of a home with cats.',
          fi: 'Myrkkyä on koko kasvissa. Turvallisinta on olla pitämättä liljoja kodissa, jossa on kissa.',
          sv: 'Giftet finns i hela växten. Det säkraste är att inte ha liljor i ett hem med katt.',
        },
      },
      {
        id: 'seems-fine',
        prompt: {
          en: 'Your cat chewed a lily leaf but seems fine. What next?',
          fi: 'Kissa pureskeli liljan lehteä, mutta vaikuttaa terveeltä. Mitä seuraavaksi?',
          sv: 'Katten tuggade på ett liljeblad men verkar pigg. Vad gör du sedan?',
        },
        options: [
          { en: 'Wait for symptoms', fi: 'Odotan oireita', sv: 'Väntar på symtom' },
          {
            en: 'Go to a vet now, early treatment protects the kidneys',
            fi: 'Menen heti eläinlääkäriin, varhainen hoito suojaa munuaisia',
            sv: 'Åker till veterinären nu, tidig behandling skyddar njurarna',
          },
          { en: 'Give extra water and watch for a week', fi: 'Annan lisää vettä ja seuraan viikon', sv: 'Ger extra vatten och håller koll i en vecka' },
        ],
        answer: 1,
        explanation: {
          en: 'By the time symptoms show, the kidneys are already damaged. Fluid therapy started within about 18 hours greatly improves the outcome.',
          fi: 'Kun oireet näkyvät, munuaiset ovat jo vaurioituneet. Noin 18 tunnin sisällä aloitettu nesteytys parantaa ennustetta selvästi.',
          sv: 'När symtomen syns är njurarna redan skadade. Vätskebehandling som startar inom cirka 18 timmar förbättrar prognosen kraftigt.',
        },
      },
    ],
  },
  {
    id: 'heatstroke',
    title: { en: 'Heatstroke in summer', fi: 'Lämpöhalvaus kesällä', sv: 'Värmeslag på sommaren' },
    summary: {
      en: 'Spot overheating early and cool your dog safely.',
      fi: 'Tunnista ylikuumeneminen ajoissa ja viilennä koira turvallisesti.',
      sv: 'Upptäck överhettning tidigt och kyl ner hunden säkert.',
    },
    icon: 'sun',
    species: ['dog'],
    substanceId: null,
    lesson: [
      {
        en: 'A parked car can get over 40 °C inside within minutes, even on a mild day.',
        fi: 'Pysäköity auto voi kuumentua sisältä yli 40 °C:seen minuuteissa, myös leutona päivänä.',
        sv: 'En parkerad bil kan bli över 40 °C inuti på några minuter, även en mild dag.',
      },
      {
        en: 'Short-nosed breeds, overweight and older dogs overheat most easily.',
        fi: 'Lyhytkuonoiset rodut sekä ylipainoiset ja iäkkäät koirat kuumenevat helpoimmin.',
        sv: 'Kortnosade raser, överviktiga och äldre hundar blir lättast överhettade.',
      },
      {
        en: 'Warning signs: heavy panting, drooling, a dark red tongue and wobbly legs.',
        fi: 'Varoitusmerkit: voimakas läähätys, kuolaaminen, tummanpunainen kieli ja huojuva kävely.',
        sv: 'Varningstecken: kraftig flämtning, dregling, mörkröd tunga och ostadiga ben.',
      },
    ],
    questions: [
      {
        id: 'car',
        prompt: {
          en: 'It is 22 °C. Can you leave your dog in the car for 10 minutes?',
          fi: 'On 22 °C lämmintä. Voitko jättää koiran autoon 10 minuutiksi?',
          sv: 'Det är 22 °C. Kan du lämna hunden i bilen i 10 minuter?',
        },
        options: [
          { en: 'Yes, with a window open a little', fi: 'Kyllä, kun ikkuna on vähän auki', sv: 'Ja, med fönstret lite öppet' },
          {
            en: 'No, the car can heat up to over 40 °C in minutes',
            fi: 'Ei, auto voi kuumentua yli 40 °C:seen minuuteissa',
            sv: 'Nej, bilen kan bli över 40 °C på några minuter',
          },
          { en: 'Yes, if parked in the shade', fi: 'Kyllä, jos auto on varjossa', sv: 'Ja, om bilen står i skuggan' },
        ],
        answer: 1,
        explanation: {
          en: 'An open window or shade barely slows the heat. Dogs cool down mainly by panting, which stops working in hot, still air.',
          fi: 'Raollaan oleva ikkuna tai varjo hidastaa kuumenemista vain vähän. Koira viilentää itseään lähinnä läähättämällä, mikä ei toimi kuumassa ja seisovassa ilmassa.',
          sv: 'Ett öppet fönster eller skugga bromsar knappt värmen. Hundar kyler sig främst genom att flämta, och det fungerar inte i varm, stillastående luft.',
        },
      },
      {
        id: 'first-aid',
        prompt: {
          en: 'After a walk in the heat your dog pants heavily and wobbles. What do you do first?',
          fi: 'Helteisen lenkin jälkeen koira läähättää voimakkaasti ja horjuu. Mitä teet ensin?',
          sv: 'Efter en promenad i värmen flämtar hunden kraftigt och vinglar. Vad gör du först?',
        },
        options: [
          { en: 'Put it in an ice-cold bath', fi: 'Laitan sen jääkylmään kylpyyn', sv: 'Lägger den i ett iskallt bad' },
          {
            en: 'Move it to the shade, cool it with cool water and call a vet',
            fi: 'Siirrän sen varjoon, viilennän viileällä vedellä ja soitan eläinlääkärille',
            sv: 'Flyttar den till skuggan, kyler med svalt vatten och ringer en veterinär',
          },
          { en: 'Let it rest at home and see', fi: 'Annan sen levätä kotona ja katson', sv: 'Låter den vila hemma och ser' },
        ],
        answer: 1,
        explanation: {
          en: 'Ice-cold water narrows the blood vessels in the skin and slows cooling. Cool water and air flow work best. See a vet even if your dog recovers, as organ damage can show later.',
          fi: 'Jääkylmä vesi supistaa ihon verisuonia ja hidastaa viilenemistä. Viileä vesi ja ilmavirta toimivat parhaiten. Käy eläinlääkärissä, vaikka koira toipuisi, sillä elinvauriot voivat näkyä myöhemmin.',
          sv: 'Iskallt vatten drar ihop blodkärlen i huden och bromsar nedkylningen. Svalt vatten och luftflöde fungerar bäst. Åk till veterinären även om hunden återhämtar sig, eftersom organskador kan visa sig senare.',
        },
      },
      {
        id: 'risk',
        prompt: {
          en: 'Which dogs are most at risk of heatstroke?',
          fi: 'Mitkä koirat ovat suurimmassa vaarassa saada lämpöhalvauksen?',
          sv: 'Vilka hundar löper störst risk för värmeslag?',
        },
        options: [
          {
            en: 'Short-nosed breeds such as pugs and bulldogs',
            fi: 'Lyhytkuonoiset rodut, kuten mopsit ja bulldogit',
            sv: 'Kortnosade raser som mops och bulldogg',
          },
          { en: 'Only puppies', fi: 'Vain pennut', sv: 'Bara valpar' },
          { en: 'Only long-haired dogs', fi: 'Vain pitkäkarvaiset koirat', sv: 'Bara långhåriga hundar' },
        ],
        answer: 0,
        explanation: {
          en: 'Short-nosed dogs have narrow airways, so panting cools them poorly. Keep walks short and in the coolest part of the day.',
          fi: 'Lyhytkuonoisten koirien hengitystiet ovat ahtaat, joten läähätys viilentää niitä huonosti. Pidä lenkit lyhyinä ja ulkoile päivän viileimpään aikaan.',
          sv: 'Kortnosade hundar har trånga luftvägar, så flämtningen kyler dem dåligt. Håll promenaderna korta och gå ut när det är svalast.',
        },
      },
    ],
  },
];

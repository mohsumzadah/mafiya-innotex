// Səssiz kino sözləri: hər söz [az, ru, en]. İzah edən oyunçu sözü öz dilində görür.
// İmposter kateqoriyalarının bir hissəsi də burada istifadə olunur (göstərməyə uyğun olanlar).
const { CATEGORIES: IMP } = require('./imposter-words');

const CATEGORIES = {
  films: {
    name: 'Filmlər',
    words: [
      ['Titanik', 'Титаник', 'Titanic'], ['Hörümçək adam', 'Человек-паук', 'Spider-Man'], ['Harri Potter', 'Гарри Поттер', 'Harry Potter'],
      ['Şir Kral', 'Король Лев', 'The Lion King'], ['Matrix', 'Матрица', 'The Matrix'], ['Avatar', 'Аватар', 'Avatar'],
      ['Terminator', 'Терминатор', 'The Terminator'], ['Evdə tək', 'Один дома', 'Home Alone'], ['Buzlaq dövrü', 'Ледниковый период', 'Ice Age'],
      ['Madaqaskar', 'Мадагаскар', 'Madagascar'], ['Karayıb dənizi quldurları', 'Пираты Карибского моря', 'Pirates of the Caribbean'],
      ['Yura dövrü parkı', 'Парк юрского периода', 'Jurassic Park'], ['Şrek', 'Шрек', 'Shrek'], ['Batman', 'Бэтмен', 'Batman'],
      ['Arşın mal alan', 'Аршин мал алан', 'Arshin Mal Alan'], ['O olmasın, bu olsun', 'Не та, так эта', 'If Not That One, Then This One'],
      ['Qayınana', 'Тёща', 'Mother-in-law'], ['Bəxtiyar', 'Бахтияр', 'Bakhtiyar'], ['Uzaq sahillərdə', 'На далёких берегах', 'On Distant Shores'],
      ['Donmuş ürək', 'Холодное сердце', 'Frozen'], ['Oyuncaq hekayəsi', 'История игрушек', 'Toy Story'], ['Rokki', 'Рокки', 'Rocky'],
    ],
  },
  actions: {
    name: 'Hərəkətlər',
    words: [
      ['Diş fırçalamaq', 'Чистить зубы', 'Brushing teeth'], ['Velosiped sürmək', 'Кататься на велосипеде', 'Riding a bike'],
      ['Selfi çəkmək', 'Делать селфи', 'Taking a selfie'], ['Yemək bişirmək', 'Готовить еду', 'Cooking'], ['Rəqs etmək', 'Танцевать', 'Dancing'],
      ['Balıq tutmaq', 'Ловить рыбу', 'Fishing'], ['Şar üfürmək', 'Надувать шарик', 'Blowing up a balloon'], ['Ağac əkmək', 'Сажать дерево', 'Planting a tree'],
      ['Maşın sürmək', 'Водить машину', 'Driving a car'], ['Gitara çalmaq', 'Играть на гитаре', 'Playing guitar'], ['Yuxudan oyanmaq', 'Просыпаться', 'Waking up'],
      ['Paltar ütüləmək', 'Гладить одежду', 'Ironing clothes'], ['Çay dəmləmək', 'Заваривать чай', 'Brewing tea'], ['Mahnı oxumaq', 'Петь песню', 'Singing'],
      ['Qar adamı düzəltmək', 'Лепить снеговика', 'Building a snowman'], ['Çətir açmaq', 'Открывать зонт', 'Opening an umbrella'],
      ['Hədiyyə açmaq', 'Открывать подарок', 'Opening a present'], ['Futbol oynamaq', 'Играть в футбол', 'Playing football'],
      ['Uçağa minmək', 'Садиться в самолёт', 'Boarding a plane'], ['Sms yazmaq', 'Писать сообщение', 'Texting'],
      ['Kitab oxumaq', 'Читать книгу', 'Reading a book'], ['Pizza yemək', 'Есть пиццу', 'Eating pizza'],
    ],
  },
  jobs: IMP.jobs,
  animals: IMP.animals,
  sports: IMP.sports,
  objects: IMP.objects,
  transport: IMP.transport,
  azerbaijan: IMP.azerbaijan,
};

module.exports = { CATEGORIES };

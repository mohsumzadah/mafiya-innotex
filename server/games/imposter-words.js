// İmposter sözləri: hər söz [az, ru, en]. Hər oyunçu sözü öz dilində görür.
// Yeni kateqoriya əlavə etmək üçün buraya yazıb public/js/i18n.js-də adını tərcümə et.

const CATEGORIES = {
  food: {
    name: 'Yemək',
    words: [
      ['Plov', 'Плов', 'Pilaf'], ['Dolma', 'Долма', 'Dolma'], ['Pizza', 'Пицца', 'Pizza'], ['Şokolad', 'Шоколад', 'Chocolate'],
      ['Dondurma', 'Мороженое', 'Ice cream'], ['Kabab', 'Шашлык', 'Kebab'], ['Pendir', 'Сыр', 'Cheese'], ['Bal', 'Мёд', 'Honey'],
      ['Şorba', 'Суп', 'Soup'], ['Tort', 'Торт', 'Cake'], ['Çörək', 'Хлеб', 'Bread'], ['Qarpız', 'Арбуз', 'Watermelon'],
      ['Yumurta', 'Яйцо', 'Egg'], ['Makaron', 'Макароны', 'Pasta'], ['Burger', 'Бургер', 'Burger'], ['Paxlava', 'Пахлава', 'Baklava'],
      ['Qəhvə', 'Кофе', 'Coffee'], ['Limon', 'Лимон', 'Lemon'],
    ],
  },
  animals: {
    name: 'Heyvanlar',
    words: [
      ['Pişik', 'Кошка', 'Cat'], ['İt', 'Собака', 'Dog'], ['Fil', 'Слон', 'Elephant'], ['Zürafə', 'Жираф', 'Giraffe'],
      ['Aslan', 'Лев', 'Lion'], ['Pinqvin', 'Пингвин', 'Penguin'], ['Dəvə', 'Верблюд', 'Camel'], ['At', 'Лошадь', 'Horse'],
      ['Tısbağa', 'Черепаха', 'Turtle'], ['Dovşan', 'Кролик', 'Rabbit'], ['Meymun', 'Обезьяна', 'Monkey'], ['Köpəkbalığı', 'Акула', 'Shark'],
      ['Qartal', 'Орёл', 'Eagle'], ['İlan', 'Змея', 'Snake'], ['Ayı', 'Медведь', 'Bear'], ['Delfin', 'Дельфин', 'Dolphin'],
      ['Tovuz quşu', 'Павлин', 'Peacock'], ['Kərgədan', 'Носорог', 'Rhino'],
    ],
  },
  jobs: {
    name: 'Peşələr',
    words: [
      ['Həkim', 'Врач', 'Doctor'], ['Müəllim', 'Учитель', 'Teacher'], ['Pilot', 'Пилот', 'Pilot'], ['Aşpaz', 'Повар', 'Chef'],
      ['Polis', 'Полицейский', 'Police officer'], ['Proqramçı', 'Программист', 'Programmer'], ['Bərbər', 'Парикмахер', 'Barber'],
      ['Yanğınsöndürən', 'Пожарный', 'Firefighter'], ['Jurnalist', 'Журналист', 'Journalist'], ['Memar', 'Архитектор', 'Architect'],
      ['Dişçi', 'Стоматолог', 'Dentist'], ['Fotoqraf', 'Фотограф', 'Photographer'], ['Hakim', 'Судья', 'Judge'], ['Kosmonavt', 'Космонавт', 'Astronaut'],
      ['Dizayner', 'Дизайнер', 'Designer'], ['Futbolçu', 'Футболист', 'Footballer'], ['Aktyor', 'Актёр', 'Actor'], ['Taksi sürücüsü', 'Таксист', 'Taxi driver'],
    ],
  },
  places: {
    name: 'Məkanlar',
    words: [
      ['Xəstəxana', 'Больница', 'Hospital'], ['Məktəb', 'Школа', 'School'], ['Hava limanı', 'Аэропорт', 'Airport'], ['Kinoteatr', 'Кинотеатр', 'Cinema'],
      ['Çimərlik', 'Пляж', 'Beach'], ['Kitabxana', 'Библиотека', 'Library'], ['Stadion', 'Стадион', 'Stadium'], ['Bazar', 'Рынок', 'Market'],
      ['Muzey', 'Музей', 'Museum'], ['Restoran', 'Ресторан', 'Restaurant'], ['Zoopark', 'Зоопарк', 'Zoo'], ['Bank', 'Банк', 'Bank'],
      ['Ofis', 'Офис', 'Office'], ['Metro', 'Метро', 'Subway'], ['Toy salonu', 'Свадебный зал', 'Wedding hall'], ['İdman zalı', 'Спортзал', 'Gym'],
      ['Aptek', 'Аптека', 'Pharmacy'], ['Kosmik stansiya', 'Космическая станция', 'Space station'],
    ],
  },
  countries: {
    name: 'Ölkələr',
    words: [
      ['Türkiyə', 'Турция', 'Turkey'], ['Yaponiya', 'Япония', 'Japan'], ['Braziliya', 'Бразилия', 'Brazil'], ['İtaliya', 'Италия', 'Italy'],
      ['Misir', 'Египет', 'Egypt'], ['Fransa', 'Франция', 'France'], ['Çin', 'Китай', 'China'], ['Meksika', 'Мексика', 'Mexico'],
      ['Hindistan', 'Индия', 'India'], ['Avstraliya', 'Австралия', 'Australia'], ['Kanada', 'Канада', 'Canada'], ['Gürcüstan', 'Грузия', 'Georgia'],
      ['İspaniya', 'Испания', 'Spain'], ['Almaniya', 'Германия', 'Germany'], ['BƏƏ', 'ОАЭ', 'UAE'], ['İngiltərə', 'Англия', 'England'],
      ['Norveç', 'Норвегия', 'Norway'], ['Koreya', 'Корея', 'Korea'],
    ],
  },
  objects: {
    name: 'Əşyalar',
    words: [
      ['Telefon', 'Телефон', 'Phone'], ['Çətir', 'Зонт', 'Umbrella'], ['Güzgü', 'Зеркало', 'Mirror'], ['Saat', 'Часы', 'Watch'],
      ['Açar', 'Ключ', 'Key'], ['Eynək', 'Очки', 'Glasses'], ['Yastıq', 'Подушка', 'Pillow'], ['Qayçı', 'Ножницы', 'Scissors'],
      ['Şam', 'Свеча', 'Candle'], ['Soyuducu', 'Холодильник', 'Fridge'], ['Kitab', 'Книга', 'Book'], ['Çanta', 'Сумка', 'Bag'],
      ['Diş fırçası', 'Зубная щётка', 'Toothbrush'], ['Noutbuk', 'Ноутбук', 'Laptop'], ['Fen', 'Фен', 'Hair dryer'], ['Kamera', 'Камера', 'Camera'],
      ['Gitara', 'Гитара', 'Guitar'], ['Xalça', 'Ковёр', 'Carpet'],
    ],
  },
  sports: {
    name: 'İdman',
    words: [
      ['Futbol', 'Футбол', 'Football'], ['Basketbol', 'Баскетбол', 'Basketball'], ['Tennis', 'Теннис', 'Tennis'], ['Üzgüçülük', 'Плавание', 'Swimming'],
      ['Güləş', 'Борьба', 'Wrestling'], ['Boks', 'Бокс', 'Boxing'], ['Şahmat', 'Шахматы', 'Chess'], ['Voleybol', 'Волейбол', 'Volleyball'],
      ['Xizək', 'Лыжи', 'Skiing'], ['Velosiped idmanı', 'Велоспорт', 'Cycling'], ['Gimnastika', 'Гимнастика', 'Gymnastics'], ['Qolf', 'Гольф', 'Golf'],
      ['Karate', 'Карате', 'Karate'], ['Formula 1', 'Формула 1', 'Formula 1'], ['Stolüstü tennis', 'Настольный теннис', 'Table tennis'], ['Marafon', 'Марафон', 'Marathon'],
    ],
  },
  transport: {
    name: 'Nəqliyyat',
    words: [
      ['Təyyarə', 'Самолёт', 'Airplane'], ['Qatar', 'Поезд', 'Train'], ['Avtobus', 'Автобус', 'Bus'], ['Velosiped', 'Велосипед', 'Bicycle'],
      ['Gəmi', 'Корабль', 'Ship'], ['Helikopter', 'Вертолёт', 'Helicopter'], ['Motosiklet', 'Мотоцикл', 'Motorcycle'], ['Taksi', 'Такси', 'Taxi'],
      ['Raket', 'Ракета', 'Rocket'], ['Tramvay', 'Трамвай', 'Tram'], ['Sualtı qayıq', 'Подводная лодка', 'Submarine'], ['Samokat', 'Самокат', 'Scooter'],
      ['Hava şarı', 'Воздушный шар', 'Hot-air balloon'], ['Yük maşını', 'Грузовик', 'Truck'], ['Teleferik', 'Канатная дорога', 'Cable car'], ['Yaxta', 'Яхта', 'Yacht'],
    ],
  },
  azerbaijan: {
    name: 'Azərbaycan',
    words: [
      ['Qız qalası', 'Девичья башня', 'Maiden Tower'], ['Alov qüllələri', 'Пламенные башни', 'Flame Towers'], ['Şəki', 'Шеки', 'Shaki'],
      ['Qəbələ', 'Габала', 'Gabala'], ['Muğam', 'Мугам', 'Mugham'], ['Tar', 'Тар', 'Tar'], ['Novruz', 'Новруз', 'Novruz'],
      ['Şəkərbura', 'Шекербура', 'Shekerbura'], ['Xan sarayı', 'Ханский дворец', 'Khan’s Palace'], ['Qobustan', 'Гобустан', 'Gobustan'],
      ['Bulvar', 'Бульвар', 'Boulevard'], ['Yanardağ', 'Янардаг', 'Yanardag'], ['Xəzər dənizi', 'Каспийское море', 'Caspian Sea'],
      ['Şuşa', 'Шуша', 'Shusha'], ['Kəlağayı', 'Кялагаи', 'Kalaghayi'], ['Qutab', 'Кутаб', 'Qutab'], ['Nar', 'Гранат', 'Pomegranate'],
      ['İçərişəhər', 'Ичеришехер', 'Old City'],
    ],
  },
};

module.exports = { CATEGORIES };

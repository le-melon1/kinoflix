# Netflix Catalog with ALL Classic Genres and Streaming Presets
from typing import List, Dict, Any

ALL_GENRES = [
    {"id": "all", "name": "Всё", "icon": "🎬"},
    {"id": "new_releases", "name": "Новинки 2024-2026", "icon": "🔥"},
    {"id": "top100", "name": "Топ-100 Кинопоиска & IMDb", "icon": "🏆"},
    {"id": "netflix_picks", "name": "Хиты Netflix", "icon": "🔴"},
    {"id": "series", "name": "Сериалы", "icon": "📺"},
    {"id": "action", "name": "Боевики", "icon": "💥"},
    {"id": "comedies", "name": "Комедии", "icon": "😂"},
    {"id": "dramas", "name": "Драмы", "icon": "🎭"},
    {"id": "scifi", "name": "Фантастика", "icon": "🚀"},
    {"id": "thrillers", "name": "Триллеры", "icon": "🔪"},
    {"id": "horror", "name": "Ужасы", "icon": "👻"},
    {"id": "anime", "name": "Аниме", "icon": "⛩️"},
    {"id": "detectives", "name": "Детективы", "icon": "🔍"},
    {"id": "crime", "name": "Криминал", "icon": "🔫"},
    {"id": "adventure", "name": "Приключения", "icon": "🧭"},
    {"id": "fantasy", "name": "Фэнтези", "icon": "🧙"},
    {"id": "romance", "name": "Мелодрамы", "icon": "❤️"},
    {"id": "animation", "name": "Мультфильмы", "icon": "🎨"},
    {"id": "history_war", "name": "Военные и история", "icon": "⚔️"},
    {"id": "western", "name": "Вестерны", "icon": "🤠"},
    {"id": "documentary", "name": "Документальное", "icon": "📹"},
    {"id": "blockbusters_4k", "name": "4K Ultra HD", "icon": "💎"},
]

# Curated items with authentic 16:9 backdrops & posters
TRENDING_MOVIES: List[Dict[str, Any]] = [
    {
        "id": "dune2",
        "title": "Дюна: Часть вторая",
        "original_title": "Dune: Part Two",
        "year": "2024",
        "rating": "8.5",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "2 ч 46 мин",
        "duration_seconds": 9960,
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия) • Red Head Sound",
        "genre": "Фантастика • Приключения • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg",
        "plot": "Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам, уничтожившим его семью, и предотвратить катастрофическое будущее Вселенной.",
        "search_query": "Дюна: Часть вторая",
        "is_series": False
    },
    {
        "id": "substance",
        "title": "Субстанция",
        "original_title": "The Substance",
        "year": "2024",
        "rating": "7.8",
        "match": "96% совпадение",
        "age": "18+",
        "duration": "2 ч 21 мин",
        "duration_seconds": 8460,
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Ужасы • Драма • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bVSOgrxasVJF6V71T7v2KfBRSzu.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/x3yhBGbTqlAjxM450BANUNCHpOO.jpg",
        "plot": "Увядающая звезда фитнес-шоу соглашается на инъекцию революционного вещества, которое создаёт её молодую идеальную копию.",
        "search_query": "Субстанция",
        "is_series": False
    },
    {
        "id": "arcane",
        "title": "Аркейн",
        "original_title": "Arcane",
        "year": "2024",
        "rating": "9.0",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "2 Сезона",
        "duration_seconds": 2700,
        "quality": "4K UHD",
        "audio": "Дубляж • Ред Хед Саунд",
        "genre": "Анимация • Фантастика • Боевик",
        "backdrop": "https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/kVioUjk1SXGWblJNaKsIJcBqUcY.jpg",
        "plot": "В условиях глубоких разногласий между городами-близнецами две сестры оказываются по разные стороны баррикад в войне технологий и убеждений.",
        "search_query": "Аркейн",
        "is_series": True
    },
    {
        "id": "penguin",
        "title": "Пингвин",
        "original_title": "The Penguin",
        "year": "2024",
        "rating": "8.8",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "1 Сезон",
        "duration_seconds": 3600,
        "quality": "4K HDR",
        "audio": "HDRezka • LostFilm",
        "genre": "Криминал • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/4TdmuuwiIiKw3JOjIuhdgYxRXnN.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/25dj85s5VtirRWF6rmO8TpZXHJV.jpg",
        "plot": "Освальд Кобблпот стремится захватить власть в преступном мире Готэма после смерти криминального босса Фальконе.",
        "search_query": "Пингвин",
        "is_series": True
    },
    {
        "id": "shogun",
        "title": "Сёгун",
        "original_title": "Shogun",
        "year": "2024",
        "rating": "8.7",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "1 Сезон",
        "duration_seconds": 3600,
        "quality": "4K HDR",
        "audio": "Дубляж • LostFilm",
        "genre": "Драма • История • Приключения",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/cOKLRblbdBtcuf4TkAzsyJpZr23.jpg",
        "plot": "Английский штурман терпит крушение у берегов феодальной Японии и оказывается втянут в борьбу могущественного лорда Торанаги.",
        "search_query": "Сёгун",
        "is_series": True
    },
    {
        "id": "fallout",
        "title": "Фоллаут",
        "original_title": "Fallout",
        "year": "2024",
        "rating": "8.4",
        "match": "97% совпадение",
        "age": "18+",
        "duration": "1 Сезон",
        "duration_seconds": 3600,
        "quality": "4K HDR",
        "audio": "Кубик в Кубе • Red Head Sound",
        "genre": "Фантастика • Боевик • Приключения",
        "backdrop": "https://image.tmdb.org/t/p/w1280/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/7o3XRf31lEtAaRNtgupOGTDD3sP.jpg",
        "plot": "Спустя 200 лет после ядерного апокалипсиса наивная жительница Убежища вынуждена выйти на поверхность опасной пустоши.",
        "search_query": "Фоллаут",
        "is_series": True
    },
    {
        "id": "deadpool3",
        "title": "Дэдпул и Росомаха",
        "original_title": "Deadpool & Wolverine",
        "year": "2024",
        "rating": "7.9",
        "match": "96% совпадение",
        "age": "18+",
        "duration": "2 ч 08 мин",
        "duration_seconds": 7680,
        "quality": "4K UHD",
        "audio": "Red Head Sound (Гланц и Рахленко)",
        "genre": "Боевик • Комедия • Фантастика",
        "backdrop": "https://image.tmdb.org/t/p/w1280/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        "plot": "Уэйд Уилсон объединяется с нелюдимым Росомахой, чтобы спасти свою вселенную от полного уничтожения.",
        "search_query": "Дэдпул и Росомаха",
        "is_series": False
    },
    {
        "id": "alien_romulus",
        "title": "Чужой: Ромул",
        "original_title": "Alien: Romulus",
        "year": "2024",
        "rating": "7.3",
        "match": "95% совпадение",
        "age": "18+",
        "duration": "1 ч 59 мин",
        "duration_seconds": 7140,
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия) • RHS",
        "genre": "Ужасы • Фантастика • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
        "plot": "Группа молодых колонизаторов исследует заброшенную станцию и сталкивается с самой смертоносной формой жизни во Вселенной.",
        "search_query": "Чужой: Ромул",
        "is_series": False
    },
    {
        "id": "interstellar",
        "title": "Интерстеллар",
        "original_title": "Interstellar",
        "year": "2014",
        "rating": "8.7",
        "match": "99% совпадение",
        "age": "12+",
        "duration": "2 ч 49 мин",
        "duration_seconds": 10140,
        "quality": "4K UHD",
        "audio": "Дубляж • Dolby Atmos",
        "genre": "Фантастика • Драма • Приключения",
        "backdrop": "https://image.tmdb.org/t/p/w1280/8sNiAPPYU14PUepFNeSNGUTiHW.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
        "plot": "Группа исследователей отправляется сквозь червоточину в поисках нового дома для вымирающего человечества.",
        "search_query": "Интерстеллар",
        "is_series": False
    },
    {
        "id": "oppenheimer",
        "title": "Оппенгеймер",
        "original_title": "Oppenheimer",
        "year": "2023",
        "rating": "8.9",
        "match": "97% совпадение",
        "age": "18+",
        "duration": "3 ч 00 мин",
        "duration_seconds": 10800,
        "quality": "4K UHD",
        "audio": "Дубляж (Чистый звук)",
        "genre": "Биография • Драма • История",
        "backdrop": "https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "plot": "История жизни физика Роберта Оппенгеймера, возглавившего Манхэттенский проект по созданию первого ядерного оружия.",
        "search_query": "Оппенгеймер",
        "is_series": False
    },
    {
        "id": "rickandmorty",
        "title": "Рик и Морти",
        "original_title": "Rick and Morty",
        "year": "2024",
        "rating": "9.1",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "8 Сезонов",
        "duration_seconds": 1333,
        "quality": "1080p",
        "audio": "Сыендук • HDRezka",
        "genre": "Мультфильм • Комедия • Фантастика",
        "backdrop": "https://image.tmdb.org/t/p/w1280/5BDNWWHweQL0q1fmTv7gmRXfnl4.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/owhkU6KRqdXoUQpjV8uyZGPtX58.jpg",
        "plot": "Безумный гениальный учёный Рик Санчез вместе со своим внуком Морти путешествует по мультивселенной.",
        "search_query": "Рик и Морти",
        "is_series": True
    },
    {
        "id": "lastofus",
        "title": "Одни из нас",
        "original_title": "The Last of Us",
        "year": "2023",
        "rating": "8.8",
        "match": "96% совпадение",
        "age": "18+",
        "duration": "1 Сезон",
        "duration_seconds": 3300,
        "quality": "4K HDR",
        "audio": "Red Head Sound • LostFilm",
        "genre": "Драма • Фантастика • Боевик",
        "backdrop": "https://image.tmdb.org/t/p/w1280/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/69loIrm9JPpPRE3Akw4yRoitSYn.jpg",
        "plot": "Контрабандист Джоэл должен провести 14-летнюю Элли через руины США после опустошительной пандемии смертоносного грибка.",
        "search_query": "Одни из нас",
        "is_series": True
    },
    {
        "id": "breakingbad",
        "title": "Во все тяжкие",
        "original_title": "Breaking Bad",
        "year": "2013",
        "rating": "9.5",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "5 Сезонов",
        "duration_seconds": 2820,
        "quality": "1080p",
        "audio": "LostFilm • Кубик в Кубе",
        "genre": "Криминал • Драма • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
        "plot": "Школьный учитель химии узнает о смертельном диагнозе и начинает производить метамфетамин ради будущего семьи.",
        "search_query": "Во все тяжкие",
        "is_series": True
    },
    {
        "id": "strangerthings",
        "title": "Очень странные дела",
        "original_title": "Stranger Things",
        "year": "2024",
        "rating": "8.7",
        "match": "98% совпадение",
        "age": "16+",
        "duration": "4 Сезона",
        "duration_seconds": 3100,
        "quality": "4K HDR",
        "audio": "Дубляж • LostFilm",
        "genre": "Фантастика • Ужасы • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/9P4IIMYY3HifqeruZq0ZZ9g7YUi.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
        "plot": "Таинственное исчезновение мальчика в Хоукинсе открывает портал в потусторонний мир «Изнанки».",
        "search_query": "Очень странные дела",
        "is_series": True
    },
    {
        "id": "inception",
        "title": "Начало",
        "original_title": "Inception",
        "year": "2010",
        "rating": "8.8",
        "match": "98% совпадение",
        "age": "12+",
        "duration": "2 ч 28 мин",
        "duration_seconds": 8880,
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Фантастика • Боевик • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
        "plot": "Кобб — мастер извлечения тайн из глубин подсознания во время сна.",
        "search_query": "Начало",
        "is_series": False
    },
    {
        "id": "fightclub",
        "title": "Бойцовский клуб",
        "original_title": "Fight Club",
        "year": "1999",
        "rating": "8.8",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "2 ч 19 мин",
        "duration_seconds": 8340,
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Триллер • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg",
        "plot": "Сотрудник страховой компании знакомится с продавцом мыла Тайлером Дёрденом и создаёт подпольный клуб.",
        "search_query": "Бойцовский клуб",
        "is_series": False
    }
]

# Action (Боевики)
ACTION_MOVIES: List[Dict[str, Any]] = [
    {
        "id": "john_wick_4",
        "title": "Джон Уик 4",
        "original_title": "John Wick: Chapter 4",
        "year": "2023",
        "rating": "7.9",
        "match": "97% совпадение",
        "age": "18+",
        "duration": "2 ч 49 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Боевик • Триллер • Криминал",
        "backdrop": "https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/o29otcx30U3EkqNVGC2feJVz5yr.jpg",
        "plot": "Джон Уик находит способ победить Правление Кланов, сражаясь с новыми смертоносными врагами по всему миру.",
        "search_query": "Джон Уик 4",
        "is_series": False
    },
    {
        "id": "mad_max_fury",
        "title": "Безумный Макс: Дорога ярости",
        "original_title": "Mad Max: Fury Road",
        "year": "2015",
        "rating": "8.1",
        "match": "98% совпадение",
        "age": "16+",
        "duration": "2 ч 00 мин",
        "quality": "4K UHD",
        "audio": "Дубляж • Dolby Atmos",
        "genre": "Боевик • Приключения • Фантастика",
        "backdrop": "https://image.tmdb.org/t/p/w1280/gqrnQA6Xppdl8vIb2eJc58VC1tW.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/8FM6AhLMX3X6OcZjfmH24F4rKMI.jpg",
        "plot": "В постапокалиптической пустыне Макс объединяется с воительницей Фуриосой, чтобы спастись от тирана Несмертного Джо.",
        "search_query": "Безумный Макс Дорога ярости",
        "is_series": False
    },
    {
        "id": "top_gun_maverick",
        "title": "Топ Ган: Мэверик",
        "original_title": "Top Gun: Maverick",
        "year": "2022",
        "rating": "8.3",
        "match": "98% совпадение",
        "age": "12+",
        "duration": "2 ч 10 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Боевик • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/jpVrsq4uZiYcAlQ6phjHbY72uEM.jpg",
        "plot": "Спустя 30 лет службы Пит «Мэверик» Митчелл готовит выпускников Top Gun к сложнейшей воздушной операции.",
        "search_query": "Топ Ган Мэверик",
        "is_series": False
    },
    {
        "id": "gladiator",
        "title": "Гладиатор",
        "original_title": "Gladiator",
        "year": "2000",
        "rating": "8.5",
        "match": "98% совпадение",
        "age": "16+",
        "duration": "2 ч 35 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Боевик • Драма • Приключения",
        "backdrop": "https://image.tmdb.org/t/p/w1280/Ar7QuJ7sJEiC0oP3I8fKBKIQD9u.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/aDb548BOkFfI4nFm0kx8A3Ezh7H.jpg",
        "plot": "Преданный военачальник Максимус становится гладиатором, чтобы отомстить жестокому императору Коммоду.",
        "search_query": "Гладиатор",
        "is_series": False
    }
]

# Comedies (Комедии)
COMEDIES: List[Dict[str, Any]] = [
    {
        "id": "intouchables",
        "title": "1+1 (Неприкасаемые)",
        "original_title": "Intouchables",
        "year": "2011",
        "rating": "8.8",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "1 ч 52 мин",
        "quality": "1080p BDRip",
        "audio": "Дубляж (Лицензия)",
        "genre": "Комедия • Драма • Биография",
        "backdrop": "https://image.tmdb.org/t/p/w1280/q6OGlZ1KMEb14AC8KbPCxyNOal6.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/zQsq95pYgjhJwYKqoFdeXlVse88.jpg",
        "plot": "Богатый аристократ Филипп нанимает в качестве сиделки парня с криминальным прошлым.",
        "search_query": "1+1 Неприкасаемые",
        "is_series": False
    },
    {
        "id": "gentlemen",
        "title": "Джентльмены",
        "original_title": "The Gentlemen",
        "year": "2019",
        "rating": "8.5",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "1 ч 53 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Криминал • Комедия • Боевик",
        "backdrop": "https://image.tmdb.org/t/p/w1280/yG1wltFmkX5c5ocACKfpX0tp3SY.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/bpy9uaV0oOlKnEoPzodwrSSUFXg.jpg",
        "plot": "Успешный наркобарон Микки Пирсон решает продать бизнес, что запускает цепь криминальных разборок.",
        "search_query": "Джентльмены",
        "is_series": False
    },
    {
        "id": "knives_out",
        "title": "Достать ножи",
        "original_title": "Knives Out",
        "year": "2019",
        "rating": "8.0",
        "match": "96% совпадение",
        "age": "16+",
        "duration": "2 ч 10 мин",
        "quality": "4K UHD",
        "audio": "Дубляж",
        "genre": "Комедия • Детектив • Криминал",
        "backdrop": "https://image.tmdb.org/t/p/w1280/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/mGfb75tcFWxuT8esS1isHrNFE90.jpg",
        "plot": "Частный детектив Бенуа Блан расследует смерть богатого автора романов в его особняке.",
        "search_query": "Достать ножи",
        "is_series": False
    },
    {
        "id": "green_book",
        "title": "Зеленая книга",
        "original_title": "Green Book",
        "year": "2018",
        "rating": "8.4",
        "match": "97% совпадение",
        "age": "16+",
        "duration": "2 ч 10 мин",
        "quality": "4K UHD",
        "audio": "Дубляж",
        "genre": "Комедия • Драма • Биография",
        "backdrop": "https://image.tmdb.org/t/p/w1280/5En0fmDagt3Pk8d7P3uTwfeQceg.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/fYch3e75YFnsJS9wAOOMlzErMqR.jpg",
        "plot": "Утончённый темнокожий пианист нанимает простоватого вышибалу водителем для турне по Югу США.",
        "search_query": "Зеленая книга",
        "is_series": False
    }
]

# Anime (Аниме)
ANIME_PICKS: List[Dict[str, Any]] = [
    {
        "id": "attack_on_titan",
        "title": "Атака титанов",
        "original_title": "Attack on Titan",
        "year": "2023",
        "rating": "9.1",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "4 Сезона",
        "quality": "1080p BDRip",
        "audio": "Студийная Банда • AniLibria",
        "genre": "Аниме • Боевик • Фэнтези",
        "backdrop": "https://image.tmdb.org/t/p/w1280/i2XCgLW9nSNutXQhilXH7vjUvTt.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/7ck5zGoKoNyoOXMGPKbx13mPkTS.jpg",
        "plot": "Остатки человечества укрываются за гигантскими стенами от гигантских плотоядных титанов.",
        "search_query": "Атака титанов",
        "is_series": True
    },
    {
        "id": "demon_slayer",
        "title": "Клинок, рассекающий демонов",
        "original_title": "Demon Slayer: Kimetsu no Yaiba",
        "year": "2024",
        "rating": "8.7",
        "match": "98% совпадение",
        "age": "16+",
        "duration": "4 Сезона",
        "quality": "1080p",
        "audio": "Студийная Банда • Flarrow Films",
        "genre": "Аниме • Боевик • Фэнтези",
        "backdrop": "https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/zg3GrU3jAoTGxmlGGhkfNYMOHlb.jpg",
        "plot": "Тандзиро Камадо становится охотником на демонов, чтобы исцелить обращенную сестру.",
        "search_query": "Клинок рассекающий демонов",
        "is_series": True
    },
    {
        "id": "death_note",
        "title": "Тетрадь смерти",
        "original_title": "Death Note",
        "year": "2007",
        "rating": "9.0",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "1 Сезон",
        "quality": "1080p",
        "audio": "Дубляж 2x2",
        "genre": "Аниме • Триллер • Детектив",
        "backdrop": "https://image.tmdb.org/t/p/w1280/z8IPicmEKXUO4I2UDdMEqw7RqOE.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/yzTD7P7dmZRxAQjoNxC1GxOLRiH.jpg",
        "plot": "Старшеклассник Лайт Ягами находит тетрадь, убивающую любого, чьё имя в неё записано.",
        "search_query": "Тетрадь смерти",
        "is_series": True
    },
    {
        "id": "spirited_away",
        "title": "Унесённые призраками",
        "original_title": "Spirited Away",
        "year": "2001",
        "rating": "8.6",
        "match": "98% совпадение",
        "age": "12+",
        "duration": "2 ч 05 мин",
        "quality": "1080p BDRip",
        "audio": "Дубляж (Лицензия)",
        "genre": "Аниме • Фэнтези • Приключения",
        "backdrop": "https://image.tmdb.org/t/p/w1280/6oaL4DP75yABrd5EbC4H2zq5ghc.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/txaVo4whnSduKuczZiJexhLDVQC.jpg",
        "plot": "10-летняя Тихиро попадает в таинственный мир духов и колдуний, где её родители превращаются в свиней.",
        "search_query": "Унесённые призраками",
        "is_series": False
    }
]

# Detectives (Детективы)
DETECTIVES: List[Dict[str, Any]] = [
    {
        "id": "se7en",
        "title": "Семь",
        "original_title": "Se7en",
        "year": "1995",
        "rating": "8.6",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "2 ч 07 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Детектив • Триллер • Криминал",
        "backdrop": "https://image.tmdb.org/t/p/w1280/i5H7zusQGsysGQ8i6P361Vnr0n2.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/1e7WmKXLo6xqibkYBwwGWOcF43E.jpg",
        "plot": "Два детектива расследуют серию жестоких изощрённых убийств по семи смертным грехам.",
        "search_query": "Семь 1995",
        "is_series": False
    },
    {
        "id": "shutter_island",
        "title": "Остров проклятых",
        "original_title": "Shutter Island",
        "year": "2010",
        "rating": "8.5",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "2 ч 18 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Детектив • Триллер • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/rbZvGN1A1QyZuoKzhCw8QPmf2q0.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/3UVMyefkUBiktshtKIEnNXvOFKH.jpg",
        "plot": "Два маршала расследуют таинственное исчезновение пациентки из закрытой психиатрической клиники на острове.",
        "search_query": "Остров проклятых",
        "is_series": False
    },
    {
        "id": "true_detective",
        "title": "Настоящий детектив",
        "original_title": "True Detective",
        "year": "2024",
        "rating": "8.9",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "4 Сезона",
        "quality": "1080p BDRip",
        "audio": "Amedia • Novamedia",
        "genre": "Детектив • Криминал • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/v8YFr8BbU9qsO8PYIulzTeM6Qk.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/1p60ehq2diow72QQC8pyppfexky.jpg",
        "plot": "Мрачные расследования нераскрытых убийств с глубоким погружением в психологию сыщиков.",
        "search_query": "Настоящий детектив",
        "is_series": True
    }
]

# Sci-Fi (Фантастика)
SCIFI_MOVIES: List[Dict[str, Any]] = [
    {
        "id": "matrix",
        "title": "Матрица",
        "original_title": "The Matrix",
        "year": "1999",
        "rating": "8.7",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "2 ч 16 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Фантастика • Боевик",
        "backdrop": "https://image.tmdb.org/t/p/w1280/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/kEDbym5htJgDQNenjUtSJxAHysB.jpg",
        "plot": "Хакер Нео узнаёт шокирующую правду: весь привычный мир — иллюзия, созданная искусственным интеллектом.",
        "search_query": "Матрица 1999",
        "is_series": False
    },
    {
        "id": "blade_runner_2049",
        "title": "Бегущий по лезвию 2049",
        "original_title": "Blade Runner 2049",
        "year": "2017",
        "rating": "8.0",
        "match": "97% совпадение",
        "age": "18+",
        "duration": "2 ч 44 мин",
        "quality": "4K UHD",
        "audio": "Дубляж • Dolby Atmos",
        "genre": "Фантастика • Драма • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/fnIJeT9GZvscKm5PbmAvhTYDsLh.jpg",
        "plot": "Офицер полиции Кей раскрывает тайну, способную повергнуть остатки общества в окончательный хаос.",
        "search_query": "Бегущий по лезвию 2049",
        "is_series": False
    }
]

# Thrillers & Horror (Триллеры и Ужасы)
HORROR_THRILLERS: List[Dict[str, Any]] = [
    {
        "id": "quiet_place_day1",
        "title": "Тихое место: День первый",
        "original_title": "A Quiet Place: Day One",
        "year": "2024",
        "rating": "6.7",
        "match": "94% совпадение",
        "age": "16+",
        "duration": "1 ч 40 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Ужасы • Фантастика • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/6XjMwQTvnICBz6TguiDKkDVHvgS.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/AU7RSlfndHCkm1YTstrD991Mpg.jpg",
        "plot": "Первые дни вторжения смертоносных слепых существ, ориентирующихся по малейшему звуку, в шумный Нью-Йорк.",
        "search_query": "Тихое место День первый",
        "is_series": False
    },
    {
        "id": "shining",
        "title": "Сияние",
        "original_title": "The Shining",
        "year": "1980",
        "rating": "8.4",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "2 ч 24 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Ужасы • Триллер • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/AdKA2F1SzYPhSZdEbjH1Zh75UVQ.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/bu3Qb0fpAFtTLcRAPgj8bK5KrIG.jpg",
        "plot": "Писатель Джек Торренс соглашается стать зимним смотрителем отрезанного от мира отеля «Оверлук».",
        "search_query": "Сияние 1980",
        "is_series": False
    }
]

# Fantasy & Adventure (Фэнтези и Приключения)
FANTASY_ADVENTURE: List[Dict[str, Any]] = [
    {
        "id": "lotr_return_king",
        "title": "Властелин колец: Возвращение короля",
        "original_title": "The Lord of the Rings: The Return of the King",
        "year": "2003",
        "rating": "9.0",
        "match": "99% совпадение",
        "age": "12+",
        "duration": "3 ч 21 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Режиссёрская версия)",
        "genre": "Фэнтези • Приключения • Боевик",
        "backdrop": "https://image.tmdb.org/t/p/w1280/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
        "plot": "Фродо и Сэм приближаются к Роковой горе, чтобы уничтожить Кольцо Всевластья в решающей битве Средиземья.",
        "search_query": "Властелин колец Возвращение короля",
        "is_series": False
    },
    {
        "id": "harry_potter_philosopher",
        "title": "Гарри Поттер и философский камень",
        "original_title": "Harry Potter and the Philosopher's Stone",
        "year": "2001",
        "rating": "8.2",
        "match": "98% совпадение",
        "age": "12+",
        "duration": "2 ч 32 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Фэнтези • Приключения • Семейный",
        "backdrop": "https://image.tmdb.org/t/p/w1280/hziiv14OpD73u9gAak4XDDfBKa2.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/q3LZNzwW7ZWu4kSFIPGcB5CYFE4.jpg",
        "plot": "Жизнь 11-летнего сироты Гарри Поттера переворачивается, когда он узнаёт, что он волшебник и приглашён в Хогвартс.",
        "search_query": "Гарри Поттер и философский камень",
        "is_series": False
    }
]

# Romance & Drama (Мелодрамы и Любовь)
ROMANCE_MOVIES: List[Dict[str, Any]] = [
    {
        "id": "la_la_land",
        "title": "Ла-Ла Ленд",
        "original_title": "La La Land",
        "year": "2016",
        "rating": "8.0",
        "match": "97% совпадение",
        "age": "16+",
        "duration": "2 ч 08 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Мелодрама • Комедия • Музыка",
        "backdrop": "https://image.tmdb.org/t/p/w1280/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/g7f8GdnJKS0Z3QJ5G6P9BZrqs36.jpg",
        "plot": "История любви начинающей актрисы и увлечённого джазового музыканта в сияющем Лос-Анджелесе.",
        "search_query": "Ла Ла Ленд",
        "is_series": False
    },
    {
        "id": "titanic",
        "title": "Титаник",
        "original_title": "Titanic",
        "year": "1997",
        "rating": "7.9",
        "match": "98% совпадение",
        "age": "12+",
        "duration": "3 ч 14 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Мелодрама • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/yDI6D5ZQh67YU4r2ms8qcSbAviZ.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
        "plot": "Молодые влюблённые Джек и Роза находят друг друга на борту легендарного трансатлантического лайнера.",
        "search_query": "Титаник 1997",
        "is_series": False
    }
]

# Cartoons & Family (Мультфильмы и семейные)
ANIMATION_FAMILY: List[Dict[str, Any]] = [
    {
        "id": "inside_out_2",
        "title": "Головоломка 2",
        "original_title": "Inside Out 2",
        "year": "2024",
        "rating": "7.6",
        "match": "96% совпадение",
        "age": "6+",
        "duration": "1 ч 36 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия) • RHS",
        "genre": "Мультфильм • Семейный • Комедия",
        "backdrop": "https://image.tmdb.org/t/p/w1280/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/5fXrqBIvatwSuph7nTuSETBQYxm.jpg",
        "plot": "В голове повзрослевшей Райли появляются новые неожиданные эмоции: Тревожность, Зависть и Стыд.",
        "search_query": "Головоломка 2",
        "is_series": False
    },
    {
        "id": "spider_verse",
        "title": "Человек-паук: Паутина вселенных",
        "original_title": "Spider-Man: Across the Spider-Verse",
        "year": "2023",
        "rating": "8.7",
        "match": "99% совпадение",
        "age": "12+",
        "duration": "2 ч 20 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Мультфильм • Боевик • Фантастика",
        "backdrop": "https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        "plot": "Майлз Моралес отправляется в путешествие по Мультивселенной, где встречает команду Пауков-защитников.",
        "search_query": "Человек паук Паутина вселенных",
        "is_series": False
    }
]

# History & War (Исторические и военные)
HISTORY_WAR: List[Dict[str, Any]] = [
    {
        "id": "saving_private_ryan",
        "title": "Спасти рядового Райана",
        "original_title": "Saving Private Ryan",
        "year": "1998",
        "rating": "8.6",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "2 ч 49 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Военный • Драма • История",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bdD39MpSVhKjxarTxLSfX6baoMP.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/pZDsEB9NrmIxo9aeEdJGG3BRJsl.jpg",
        "plot": "Капитан Джон Миллер получает задание найти и вернуть домой рядового Джеймса Райана.",
        "search_query": "Спасти рядового Райана",
        "is_series": False
    },
    {
        "id": "film_1917",
        "title": "1917",
        "original_title": "1917",
        "year": "2019",
        "rating": "8.3",
        "match": "97% совпадение",
        "age": "16+",
        "duration": "1 ч 59 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Военный • История • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/2lBOQK06tltt8SQaswgb8d657Mv.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/nfU1YXe2ztCSUWusLOpCUL75Zdw.jpg",
        "plot": "Два молодых британских солдата должны пересечь вражескую территорию, чтобы доставить приказ об отмене атаки.",
        "search_query": "1917 2019",
        "is_series": False
    }
]

# Westerns (Вестерны)
WESTERNS: List[Dict[str, Any]] = [
    {
        "id": "django_unchained",
        "title": "Джанго освобожденный",
        "original_title": "Django Unchained",
        "year": "2012",
        "rating": "8.5",
        "match": "98% совпадение",
        "age": "18+",
        "duration": "2 ч 45 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Вестерн • Боевик • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/2oZklIzUbvZXXzIFzv7Hi68d6xf.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/9TqgGueg974s9Vw3U1rCYK30QP3.jpg",
        "plot": "Охотник за головами освобождает раба Джанго, помогая ему отомстить и вызволить жену.",
        "search_query": "Джанго освобожденный",
        "is_series": False
    },
    {
        "id": "hateful_eight",
        "title": "Омерзительная восьмерка",
        "original_title": "The Hateful Eight",
        "year": "2015",
        "rating": "7.9",
        "match": "96% совпадение",
        "age": "18+",
        "duration": "2 ч 48 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Вестерн • Детектив • Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/7g1zO5t0bd27Iqn5ZUDJmksOGPJ.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/7qFSC1xhsHe9wxyTBxQmts7s3n4.jpg",
        "plot": "США после Гражданской войны. Метель запирает восемь опасных незнакомцев в уединенной лавке.",
        "search_query": "Омерзительная восьмерка",
        "is_series": False
    }
]

# All-time Top 100 masterpieces
TOP100_MASTERCPIECES: List[Dict[str, Any]] = [
    {
        "id": "shawshank",
        "title": "Побег из Шоушенка",
        "original_title": "The Shawshank Redemption",
        "year": "1994",
        "rating": "9.3",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "2 ч 22 мин",
        "quality": "4K UHD",
        "audio": "Дубляж • Мосфильм",
        "genre": "Драма",
        "backdrop": "https://image.tmdb.org/t/p/w1280/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
        "plot": "Успешный банкир Энди Дюфрейн несправедливо осужден на пожизненное заключение в мрачной тюрьме Шоушенк.",
        "search_query": "Побег из Шоушенка",
        "is_series": False
    },
    {
        "id": "green_mile",
        "title": "Зеленая миля",
        "original_title": "The Green Mile",
        "year": "1999",
        "rating": "9.1",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "3 ч 09 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Драма • Фэнтези • Криминал",
        "backdrop": "https://image.tmdb.org/t/p/w1280/amZavErrjrdgDwhsIdpWxHNenIx.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/lHxe8t4B0CKv4DO0C0B4rsuiG95.jpg",
        "plot": "Надзиратель блока смертников знакомится с гигантом Джоном Коффи, обладающим даром исцеления.",
        "search_query": "Зеленая миля",
        "is_series": False
    },
    {
        "id": "dark_knight",
        "title": "Темный рыцарь",
        "original_title": "The Dark Knight",
        "year": "2008",
        "rating": "9.0",
        "match": "99% совпадение",
        "age": "16+",
        "duration": "2 ч 32 мин",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Боевик • Драма • Триллер",
        "backdrop": "https://image.tmdb.org/t/p/w1280/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/aPtN76OjnNKLqCJ2FJBnQOIL031.jpg",
        "plot": "Бэтмен поднимает ставки в войне с криминалом. Но гений анархии Джокер повергает Готэм в хаос.",
        "search_query": "Темный рыцарь",
        "is_series": False
    },
    {
        "id": "pulp_fiction",
        "title": "Криминальное чтиво",
        "original_title": "Pulp Fiction",
        "year": "1994",
        "rating": "8.9",
        "match": "99% совпадение",
        "age": "18+",
        "duration": "2 ч 34 мин",
        "quality": "4K UHD",
        "audio": "Дубляж • Гоблин",
        "genre": "Криминал • Комедия",
        "backdrop": "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        "plot": "Пересекающиеся истории криминального Лос-Анджелеса с философскими беседами гангстеров.",
        "search_query": "Криминальное чтиво",
        "is_series": False
    }
]

DOCUMENTARIES: List[Dict[str, Any]] = [
    {
        "id": "our_planet",
        "title": "Наша планета",
        "original_title": "Our Planet",
        "year": "2019",
        "rating": "9.3",
        "match": "99% совпадение",
        "age": "6+",
        "duration": "1 сезон",
        "quality": "4K UHD",
        "audio": "Дубляж (Лицензия)",
        "genre": "Документальный • Природа",
        "backdrop": "https://image.tmdb.org/t/p/w1280/p8EUX6MPSNLxVwqO3fCYTi896Ro.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/65SESUs3ZO31p3N9VfymO8C5oCv.jpg",
        "plot": "Беспрецедентный по масштабности проект о дикой природе нашей Земли, снятый с использованием передовых технологий 4K.",
        "search_query": "Наша планета",
        "is_series": True
    },
    {
        "id": "last_dance",
        "title": "Последний танец",
        "original_title": "The Last Dance",
        "year": "2020",
        "rating": "9.1",
        "match": "98% совпадение",
        "age": "16+",
        "duration": "1 сезон",
        "quality": "1080p BDRip",
        "audio": "Дубляж (Лицензия Netflix)",
        "genre": "Документальный • Спорт • Биография",
        "backdrop": "https://image.tmdb.org/t/p/w1280/kY0h95L73t7a6ev6Rv0aHSCtN7y.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/bpYvXRmgB8Kd9LZQ2xB4DD7Ejzj.jpg",
        "plot": "Хроника чемпионского сезона 1997-1998 годов баскетбольного клуба Чикаго Буллз и великого Майкла Джордана.",
        "search_query": "Последний танец",
        "is_series": True
    },
    {
        "id": "samsara",
        "title": "Самсара",
        "original_title": "Samsara",
        "year": "2011",
        "rating": "8.4",
        "match": "97% совпадение",
        "age": "12+",
        "duration": "1 ч 42 мин",
        "quality": "4K UHD",
        "audio": "Музыкальное сопровождение",
        "genre": "Документальный • Философия",
        "backdrop": "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        "poster": "https://image.tmdb.org/t/p/w780/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        "plot": "Визуальное путешествие по самым удивительным уголкам планеты Земля, исследующее цикл рождения, жизни и перерождения.",
        "search_query": "Самсара",
        "is_series": False
    }
]

def get_home_catalog() -> Dict[str, Any]:
    categories = [
        {
            "id": "trending",
            "title": "В тренде прямо сейчас",
            "items": TRENDING_MOVIES[:6]
        },
        {
            "id": "top10",
            "title": "Топ-10 сегодня",
            "is_top10": True,
            "items": TRENDING_MOVIES[:10]
        },
        {
            "id": "new_releases",
            "title": "🔥 Новинки 2024–2026",
            "items": [m for m in TRENDING_MOVIES if m.get("year") in ("2024", "2025", "2026")]
        },
        {
            "id": "top100",
            "title": "🏆 Золотая коллекция: Топ Кинопоиска & IMDb",
            "items": TOP100_MASTERCPIECES + [m for m in TRENDING_MOVIES if m.get("id") in ("interstellar", "fightclub", "oppenheimer", "breakingbad")]
        },
        {
            "id": "netflix_picks",
            "title": "🔴 Хиты и рекомендации Netflix",
            "items": [m for m in TRENDING_MOVIES if m.get("id") in ("arcane", "strangerthings", "breakingbad", "rickandmorty")] + COMEDIES[:1]
        },
        {
            "id": "series",
            "title": "📺 Популярные сериалы",
            "items": [m for m in TRENDING_MOVIES if m.get("is_series")]
        },
        {
            "id": "action",
            "title": "💥 Боевики и экшн",
            "items": ACTION_MOVIES + [m for m in TRENDING_MOVIES if m.get("id") in ("deadpool3", "inception")]
        },
        {
            "id": "comedies",
            "title": "😂 Комедии",
            "items": COMEDIES + [m for m in TRENDING_MOVIES if m.get("id") in ("deadpool3", "rickandmorty")]
        },
        {
            "id": "dramas",
            "title": "🎭 Глубокие драмы",
            "items": [m for m in TRENDING_MOVIES if m.get("id") in ("oppenheimer", "lastofus", "shogun")] + TOP100_MASTERCPIECES[:2]
        },
        {
            "id": "scifi",
            "title": "🚀 Научная фантастика",
            "items": SCIFI_MOVIES + [m for m in TRENDING_MOVIES if m.get("id") in ("dune2", "interstellar", "inception")]
        },
        {
            "id": "thrillers",
            "title": "🔪 Остросюжетные триллеры",
            "items": [m for m in TRENDING_MOVIES if m.get("id") in ("substance", "fightclub")] + DETECTIVES[:2]
        },
        {
            "id": "horror",
            "title": "👻 Ужасы и хорроры",
            "items": HORROR_THRILLERS + [m for m in TRENDING_MOVIES if m.get("id") in ("substance", "alien_romulus")]
        },
        {
            "id": "anime",
            "title": "⛩️ Шедевры Аниме",
            "items": ANIME_PICKS + [m for m in TRENDING_MOVIES if m.get("id") == "arcane"]
        },
        {
            "id": "detectives",
            "title": "🔍 Запутанные детективы",
            "items": DETECTIVES + [m for m in COMEDIES if m.get("id") == "knives_out"]
        },
        {
            "id": "crime",
            "title": "🔫 Криминал и гангстеры",
            "items": [m for m in TRENDING_MOVIES if m.get("id") in ("penguin", "breakingbad")] + [m for m in COMEDIES if m.get("id") == "gentlemen"] + [TOP100_MASTERCPIECES[3]]
        },
        {
            "id": "adventure",
            "title": "🧭 Приключения",
            "items": FANTASY_ADVENTURE + [m for m in TRENDING_MOVIES if m.get("id") in ("dune2", "interstellar", "shogun")]
        },
        {
            "id": "fantasy",
            "title": "🧙 Фэнтези и мистика",
            "items": FANTASY_ADVENTURE + [m for m in ANIME_PICKS if m.get("id") in ("attack_on_titan", "spirited_away")]
        },
        {
            "id": "romance",
            "title": "❤️ Мелодрамы и романтика",
            "items": ROMANCE_MOVIES
        },
        {
            "id": "animation",
            "title": "🎨 Мультфильмы и семейное кино",
            "items": ANIMATION_FAMILY + [m for m in TRENDING_MOVIES if m.get("id") in ("rickandmorty", "arcane")]
        },
        {
            "id": "history_war",
            "title": "⚔️ Исторические и военные фильмы",
            "items": HISTORY_WAR + [m for m in TRENDING_MOVIES if m.get("id") in ("oppenheimer", "shogun")]
        },
        {
            "id": "western",
            "title": "🤠 Вестерны",
            "items": WESTERNS
        },
        {
            "id": "documentary",
            "title": "📹 Документальные шедевры",
            "items": DOCUMENTARIES
        },
        {
            "id": "blockbusters_4k",
            "title": "💎 4K Ultra HD Блокбастеры с чистым звуком",
            "items": [m for m in TRENDING_MOVIES if m.get("quality") == "4K UHD"] + ACTION_MOVIES[:2]
        }
    ]

    return {
        "billboard": TRENDING_MOVIES[0],
        "genres": ALL_GENRES,
        "categories": categories
    }

_cat_page_cache: Dict[str, List[Dict[str, Any]]] = {}

async def get_more_category_movies(category_id: str, page: int = 1) -> List[Dict[str, Any]]:
    """
    Fetches an endless feed of popular, critically acclaimed, and genre recommendations from TMDB
    for infinite horizontal & vertical scrolling in any category.
    """
    cache_key = f"{category_id}_{page}"
    if cache_key in _cat_page_cache:
        return _cat_page_cache[cache_key]

    genre_map = {
        'action': ('movie', 'with_genres=28&sort_by=popularity.desc'),
        'comedies': ('movie', 'with_genres=35&sort_by=popularity.desc'),
        'dramas': ('movie', 'with_genres=18&sort_by=popularity.desc'),
        'scifi': ('movie', 'with_genres=878&sort_by=popularity.desc'),
        'thrillers': ('movie', 'with_genres=53&sort_by=popularity.desc'),
        'horror': ('movie', 'with_genres=27&sort_by=popularity.desc'),
        'anime': ('tv', 'with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
        'detectives': ('movie', 'with_genres=9648&sort_by=popularity.desc'),
        'crime': ('movie', 'with_genres=80&sort_by=popularity.desc'),
        'adventure': ('movie', 'with_genres=12&sort_by=popularity.desc'),
        'fantasy': ('movie', 'with_genres=14&sort_by=popularity.desc'),
        'romance': ('movie', 'with_genres=10749&sort_by=popularity.desc'),
        'animation': ('movie', 'with_genres=16&sort_by=popularity.desc'),
        'history_war': ('movie', 'with_genres=36,10752&sort_by=popularity.desc'),
        'western': ('movie', 'with_genres=37&sort_by=popularity.desc'),
        'documentary': ('movie', 'with_genres=99&sort_by=popularity.desc'),
        'blockbusters_4k': ('movie', 'sort_by=revenue.desc'),
        'top100': ('movie', 'sort_by=vote_average.desc&vote_count.gte=1000'),
        'new_releases': ('movie', 'sort_by=release_date.desc&vote_count.gte=30'),
        'netflix_picks': ('tv', 'with_networks=213&sort_by=popularity.desc&vote_count.gte=100&without_genres=10767,10764'),
        'series': ('tv', 'sort_by=popularity.desc&vote_count.gte=300&without_genres=10767,10763'),
        'trending': ('trending', ''),
    }

    mtype, params = genre_map.get(category_id, ('movie', 'sort_by=popularity.desc'))
    tmdb_key = '1cf50e6248dc270629e802686245c2c8'
    if mtype == 'trending':
        url = f'https://api.themoviedb.org/3/trending/all/week?api_key={tmdb_key}&language=ru-RU&page={page}'
    else:
        url = f'https://api.themoviedb.org/3/discover/{mtype}?api_key={tmdb_key}&language=ru-RU&{params}&page={page}'

    items = []
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                for r in results:
                    title = r.get("title") or r.get("name")
                    if not title:
                        continue
                    b_path = r.get("backdrop_path")
                    p_path = r.get("poster_path")
                    if not b_path and not p_path:
                        continue
                    is_series = (mtype == "tv") or (r.get("media_type") == "tv")
                    rel = r.get("release_date") or r.get("first_air_date") or ""
                    year = rel[:4] if len(rel) >= 4 else "2024"
                    vote_avg = r.get("vote_average", 8.0)
                    rating = round(vote_avg, 1)
                    items.append({
                        "id": f"tmdb_{r['id']}",
                        "title": title,
                        "original_title": r.get("original_title") or r.get("original_name") or title,
                        "year": year,
                        "rating": str(rating),
                        "match": f"{int(min(99, max(75, rating * 10)))}% совпадение",
                        "age": "18+" if r.get("adult") else "16+",
                        "duration": "Сериал" if is_series else "2 ч 10 мин",
                        "quality": "4K UHD" if rating >= 7.5 else "1080p Full HD",
                        "audio": "Дубляж • Лицензия",
                        "genre": "Рекомендации KinoFlix",
                        "backdrop": f"https://image.tmdb.org/t/p/w1280{b_path}" if b_path else f"https://image.tmdb.org/t/p/w780{p_path}",
                        "poster": f"https://image.tmdb.org/t/p/w780{p_path}" if p_path else f"https://image.tmdb.org/t/p/w1280{b_path}",
                        "plot": r.get("overview") or "Захватывающий сюжет с неожиданными поворотами и великолепной актёрской игрой.",
                        "search_query": title,
                        "is_series": is_series
                    })
    except Exception as e:
        print(f"Error fetching more category {category_id}: {e}")

    _cat_page_cache[cache_key] = items
    return items


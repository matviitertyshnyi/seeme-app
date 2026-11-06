'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export type SupportedLanguage = 'en' | 'uk' | 'pl' | 'de' | 'fr';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string; // Clean two-letter badge: EN, UK, PL, DE, FR (zero emojis)
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: 'UK' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: 'PL' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: 'DE' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: 'FR' },
];

export const DICTIONARY = {
  en: {
    // Brand & Tagline
    app_name: 'Leave The Room',
    brand_tagline: 'Spontaneous In-Person Meetups & Verified Members',
    verified_irl: 'VERIFIED MEMBERS',
    verified_members: 'VERIFIED MEMBERS',
    in_person_community: 'In-Person Community',

    // Welcome & Auth Screen
    welcome_title: 'Leave The Room',
    welcome_sub: 'Stop sitting inside. Join spontaneous in-person games, sports, and meetups with verified nearby players.',
    continue_google: 'Continue with Google',
    continue_apple: 'Continue with Apple',
    connecting_google: 'Connecting with Google...',
    connecting_apple: 'Connecting with Apple...',
    instant_oauth_notice: 'Instant sign-in with your Google or Apple account. No separate password needed.',
    auth_verified_profiles: 'Verified Member Profiles',
    auth_local_spots: 'Local Meetup Spots',
    auth_error: 'Sign-in failed. Please try again.',

    // Navigation Labels
    nav_explore: 'Explore',
    nav_map: 'Map',
    nav_meetups: 'My Meetups',
    nav_profile: 'Profile',
    explore: 'Explore',
    map: 'Map',
    my_meetups: 'My Meetups',
    profile: 'Profile',

    // Explore Filter Bar & Headings
    explore_title: 'Discover Meetups',
    explore_subtitle: 'Real-world activities happening nearby',
    all_activities: 'All Activities',
    cat_sports: 'Sports & Fitness',
    cat_gaming: 'Gaming & Strategy',
    cat_social: 'Social & Hangout',
    cat_coworking: 'Co-Working',
    status_all: 'All Status',
    status_live: 'Live Now',
    status_upcoming: 'Upcoming',
    status_finished: 'Finished',
    radius_unit: '{radius} km',
    within_radius: 'Within {radius} km',

    // Age Preference Options
    age_filter_all: 'All Ages',
    age_all: 'All Ages (18+)',
    age_18_25: '18–25',
    age_20s_30s: '20s & 30s',
    age_25_35: '25–35',
    age_30_plus: '30+',
    age_40_plus: '40+',

    // Meetup Cards & Badges
    live_now: 'LIVE NOW',
    in_30_mins: 'IN 30 MINS',
    in_1_hour: 'IN 1 HOUR',
    badge_live_now: 'LIVE NOW',
    badge_in_30_mins: 'IN 30 MINS',
    badge_in_1_hour: 'IN 1 HOUR',
    badge_later_today: 'LATER TODAY',
    badge_finished: 'FINISHED',
    finished: 'FINISHED',
    join_spot: 'Join Spot',
    request_spot: 'Request Spot',
    joined: 'Joined',
    hosting: 'Hosting',
    pending_approval: 'Pending Approval',
    open_chat: 'Open Chat',
    see_details: 'See Details',
    spots_left: '{count} spots left',
    spots_full: 'Full',
    hosted_by: 'Hosted by {name}',

    // Empty States
    empty_explore_title: 'No meetups found nearby',
    empty_explore_desc: 'No active meetups match your current filters. Reset filters or start a meetup in 2 taps.',
    reset_filters: 'Reset Filters',
    expand_radius: 'Expand to 50 km',
    host_a_meetup: 'Host a Meetup',

    // Host Creation Wizard (CreateLobbyModal)
    create_modal_title: 'Host a Meetup',
    step_1_category: '1. Category & Activity',
    step_2_details: '2. Meetup Title, Format & Age',
    step_3_venue: '3. Meetup Location',
    step_4_time: '4. Start Time',
    step_5_size: '5. Group Size',
    step_6_join_mode: '6. Join Mode',
    custom_activity: '+ Custom Activity',
    select_presets: 'Select Presets',
    custom_activity_placeholder: 'e.g., Pickleball, Spikeball, Chess, Coding',
    title_label: 'Meetup Title',
    title_placeholder: 'e.g., Casual Coffee or Park Meetup',
    equipment_note_label: 'Equipment Note',
    equipment_note_placeholder: 'e.g., Bringing extra gear or board game.',
    spot_clue_label: 'Spot Clue (Optional)',
    spot_clue_placeholder: 'e.g., Table 3 near the water fountain, green hoodie',
    skill_level_label: 'Skill Level',
    skill_all_levels: 'All Levels',
    skill_casual: 'Casual',
    skill_competitive: 'Competitive',
    target_age_label: 'Target Age Range',
    venue_name_label: 'Meetup Location',
    venue_name_placeholder: 'Meetup Location or Park Name',
    venue_address_label: 'Cross Street / Address',
    venue_address_placeholder: 'Cross Street / Neighborhood',
    use_current_gps: 'Use Current GPS',
    start_now: 'Now',
    start_in_30: 'In 30 mins',
    start_in_60: 'In 1 hour',
    start_later: 'Later today',
    join_mode_open_title: 'Instant Join (Open)',
    join_mode_open_desc: 'First-come, first-served until player cap is reached.',
    join_mode_approval_title: 'Host Approval',
    join_mode_approval_desc: 'Review join requests and 1-tap accept or decline players.',
    optional_cohost: 'Add an optional Co-Host',
    btn_cancel: 'Cancel',
    btn_publish: 'Publish Meetup',
    btn_publishing: 'Publishing...',

    // Room Details & Arrival Status
    room_details_tab: 'Details',
    room_chat_tab: 'In-Room Chat',
    arrival_check_in_title: 'Arrival Check-In',
    arrival_here: "I'm Here!",
    arrival_5m: '5m Away',
    arrival_on_my_way: 'On My Way',
    arrival_late: '10m Late',
    copy_address: 'Copy Address',
    address_copied: 'Copied!',
    leave_meetup: 'Leave Meetup',
    delete_meetup: 'Delete Meetup',

    // In-Room Chat Chips
    chat_chip_on_way: 'On my way, about 5 mins out.',
    chat_chip_here: 'I am here at the spot now.',
    chat_chip_where: 'Which table or court are you at?',
    chat_chip_gear: 'Bringing extra gear, see you soon.',
    chat_input_placeholder: 'Write a message to group...',
    btn_send: 'Send',

    // My Meetups View
    tab_hosting: 'Hosting',
    tab_joined: 'Joined',
    tab_past: 'Past',
    empty_hosting: 'You are not hosting any meetups right now.',
    empty_joined: 'You have not joined any meetups yet.',
    empty_past: 'No past meetups found.',

    // Profile View
    profile_title: 'Profile',
    verified_identity: 'Verified Member Identity',
    unverified_identity: 'Account Unverified',
    request_verification: 'Request Verification',
    verification_pending: 'Verification Under Review',
    stat_show_up: 'Show-Up Rate',
    stat_rating: 'Player Rating',
    stat_joined: 'Meetups Joined',
    stat_hours: 'Hours Played',
    theme_appearance: 'Appearance & Dark Mode',
    theme_light: 'Light',
    theme_dark: 'Dark',
    want_to_play: 'Want-to-Play Alerts',
    alerts_on: 'Alerts ON',
    alerts_off: 'Turn On',
    menu_metrics: 'Metrics, Ratings & Regular Partners',
    menu_notifications: 'Notifications',
    menu_settings: 'App Settings & Preferences',
    menu_switch_demo: 'Switch Active Demo Account',
    btn_reset_demo: 'Reset Demo',
    btn_sign_out: 'Sign Out',
    language: 'Language',

    // Language Picker Card
    language_card_title: 'Language / Мова / Język',
    language_card_subtitle: 'Select interface language across Leave The Room',

    // Policies Section (Profile)
    policies_title: 'Community Trust & Safety',
    policies_subtitle: 'Standards ensuring safe, respectful in-person meetups',
    policy_guidelines_title: 'Community Guidelines',
    policy_guidelines_desc: 'Show up on time, communicate delays in chat, and respect players of all skill levels.',
    policy_safety_title: 'In-Person Safety Rules',
    policy_safety_desc: 'Meet only in public, well-lit spaces (parks, cafes, recreation centers). Never meet in private residences.',
    policy_terms_title: 'Terms of Service',
    policy_terms_desc: 'Leave The Room facilitates spontaneous social coordination. Members assume responsibility for their own physical safety and sports gear.',
    policy_privacy_title: 'Privacy Policy',
    policy_privacy_desc: 'Location coordinates are approximate. Your home address is never collected or disclosed to other players.',

    // Reciprocal Mutual Rating
    rate_meetup_title: 'Rate Meetup Attendees',
    rate_meetup_subtitle: 'Reciprocal feedback builds trusted in-person communities',
    rate_host_label: 'Rate Host',
    rate_player_label: 'Rate Player',
    did_they_show_up: 'Did this person show up in person?',
    showed_up_yes: 'Yes, Showed Up',
    showed_up_no: 'No-Show',
    sportsmanship_label: 'Sportsmanship & Punctuality',
    rating_comment_placeholder: 'Brief comment on teamwork, energy, or punctuality (optional)...',
    btn_submit_rating: 'Submit Reciprocal Rating',
    rating_submitted: 'Rating Recorded!',
    instant_join: 'Instant Join',
    search_placeholder: 'Search meetups...',
    available_meetups: 'Available Meetups',
    sorted_by_distance: 'Sorted by distance and live status',
    activity_type: 'Activity Type',
    i_understand: 'I understand',
    community_policies: 'Community Policies & Safety Guidelines',
    recurring_weekly: 'Weekly',
  },

  uk: {
    // Brand & Tagline
    app_name: 'Leave The Room',
    brand_tagline: 'Зустрічайся наживо: спонтанні події та перевірені учасники',
    verified_irl: 'ПЕРЕВІРЕНІ УЧАСНИКИ',
    verified_members: 'ПЕРЕВІРЕНІ УЧАСНИКИ',
    in_person_community: 'Спільнота реальних зустрічей',

    // Welcome & Auth Screen
    welcome_title: 'Leave The Room',
    welcome_sub: 'Досить сидіти вдома. Знаходьте реальних людей, спорт та зустрічі наживо з перевіреними учасниками поблизу.',
    continue_google: 'Продовжити з Google',
    continue_apple: 'Продовжити з Apple',
    connecting_google: 'Підключення через Google...',
    connecting_apple: 'Підключення через Apple...',
    instant_oauth_notice: 'Швидкий вхід через акаунт Google або Apple. Без окремих паролів.',
    auth_verified_profiles: 'Перевірені профілі учасників',
    auth_local_spots: 'Місця зустрічей поруч',
    auth_error: 'Помилка входу. Спробуйте ще раз.',

    // Navigation Labels
    nav_explore: 'Огляд',
    nav_map: 'Мапа',
    nav_meetups: 'Мої зустрічі',
    nav_profile: 'Профіль',
    explore: 'Огляд',
    map: 'Мапа',
    my_meetups: 'Зустрічі',
    profile: 'Профіль',

    // Explore Filter Bar & Headings
    explore_title: 'Пошук зустрічей',
    explore_subtitle: 'Активності наживо поруч із вами',
    all_activities: 'Усі активності',
    cat_sports: 'Спорт та фітнес',
    cat_gaming: 'Ігри та стратегії',
    cat_social: 'Спілкування та відпочинок',
    cat_coworking: 'Коворкінг',
    status_all: 'Усі статуси',
    status_live: 'Зараз наживо',
    status_upcoming: 'Незабаром',
    status_finished: 'Завершено',
    radius_unit: '{radius} км',
    within_radius: 'У радіусі {radius} км',

    // Age Preference Options
    age_filter_all: 'Усі вікові категорії',
    age_all: 'Усі вікові категорії (18+)',
    age_18_25: '18–25',
    age_20s_30s: '20-і та 30-і',
    age_25_35: '25–35',
    age_30_plus: '30+',
    age_40_plus: '40+',

    // Meetup Cards & Badges
    live_now: 'ЗАРАЗ НАЖИВО',
    in_30_mins: 'ЧЕРЕЗ 30 ХВ',
    in_1_hour: 'ЧЕРЕЗ 1 ГОД',
    badge_live_now: 'ЗАРАЗ НАЖИВО',
    badge_in_30_mins: 'ЧЕРЕЗ 30 ХВ',
    badge_in_1_hour: 'ЧЕРЕЗ 1 ГОД',
    badge_later_today: 'СЬОГОДНІ ПІЗНІШЕ',
    badge_finished: 'ЗАВЕРШЕНО',
    finished: 'ЗАВЕРШЕНО',
    join_spot: 'Приєднатися',
    request_spot: 'Подати запит',
    joined: 'Ви приєдналися',
    hosting: 'Ви організатор',
    pending_approval: 'Очікує схвалення',
    open_chat: 'Відкрити чат',
    see_details: 'Деталі',
    spots_left: 'Залишилося {count} місць',
    spots_full: 'Місць немає',
    hosted_by: 'Організатор: {name}',

    // Empty States
    empty_explore_title: 'Зустрічей поруч не знайдено',
    empty_explore_desc: 'За вашими фільтрами немає активних зустрічей. Скиньте фільтри або створіть зустріч у 2 дотики.',
    reset_filters: 'Скинути фільтри',
    expand_radius: 'Розширити до 50 км',
    host_a_meetup: 'Організувати зустріч',

    // Host Creation Wizard
    create_modal_title: 'Створити зустріч',
    step_1_category: '1. Категорія та активність',
    step_2_details: '2. Назва, атмосфера та вік',
    step_3_venue: '3. Локація зустрічі',
    step_4_time: '4. Час початку',
    step_5_size: '5. Кількість учасників',
    step_6_join_mode: '6. Формат приєднання',
    custom_activity: '+ Власна активність',
    select_presets: 'Вибрати зі списку',
    custom_activity_placeholder: 'наприклад: піклбол, спайкбол, шахи, кодинг',
    title_label: 'Назва зустрічі',
    title_placeholder: 'наприклад: 1 на 1 у настільний теніс або гра в парку',
    equipment_note_label: 'Інвентар',
    equipment_note_placeholder: 'наприклад: маю 2 додаткові ракетки та м’ячі.',
    spot_clue_label: 'Орієнтир на місці (необов’язково)',
    spot_clue_placeholder: 'наприклад: 3-й столик біля фонтану, зелене худі',
    skill_level_label: 'Рівень гри',
    skill_all_levels: 'Будь-який рівень',
    skill_casual: 'Любительський',
    skill_competitive: 'Змагальний',
    target_age_label: 'Вікова категорія',
    venue_name_label: 'Назва закладу чи парку',
    venue_name_placeholder: 'Парк або заклад',
    venue_address_label: 'Вулиця / Орієнтир',
    venue_address_placeholder: 'Перехрестя або район',
    use_current_gps: 'Поточне GPS',
    start_now: 'Зараз',
    start_in_30: 'Через 30 хв',
    start_in_60: 'Через 1 год',
    start_later: 'Сьогодні пізніше',
    join_mode_open_title: 'Миттєвий вхід (відкрито)',
    join_mode_open_desc: 'Хто перший записався, той і грає, до заповнення місць.',
    join_mode_approval_title: 'Схвалення організатора',
    join_mode_approval_desc: 'Переглядайте заявки та схвалюйте учасників в 1 дотик.',
    optional_cohost: 'Додати співорганізатора (опція)',
    btn_cancel: 'Скасувати',
    btn_publish: 'Опублікувати зустріч',
    btn_publishing: 'Публікація...',

    // Room Details & Arrival Status
    room_details_tab: 'Деталі',
    room_chat_tab: 'Чат зустрічі',
    arrival_check_in_title: 'Позначка про прибуття',
    arrival_here: 'Я на місці!',
    arrival_5m: 'Буду за 5 хв',
    arrival_on_my_way: 'Вже їду',
    arrival_late: 'Запізнююсь на 10 хв',
    copy_address: 'Скопіювати адресу',
    address_copied: 'Скопійовано!',
    leave_meetup: 'Покинути зустріч',
    delete_meetup: 'Видалити зустріч',

    // In-Room Chat Chips
    chat_chip_on_way: 'Вже їду, буду хвилин за 5.',
    chat_chip_here: 'Я вже на місці.',
    chat_chip_where: 'За яким ви столиком чи майданчиком?',
    chat_chip_gear: 'Несу додатковий інвентар, скоро буду.',
    chat_input_placeholder: 'Написати повідомлення у групу...',
    btn_send: 'Надіслати',

    // My Meetups View
    tab_hosting: 'Організую',
    tab_joined: 'Приєднався',
    tab_past: 'Минулі',
    empty_hosting: 'Зараз ви не організовуєте жодної зустрічі.',
    empty_joined: 'Ви ще не приєдналися до жодної зустрічі.',
    empty_past: 'Минулих зустрічей не знайдено.',

    // Profile View
    profile_title: 'Профіль',
    verified_identity: 'Перевірений профіль учасника',
    unverified_identity: 'Акаунт не підтверджено',
    request_verification: 'Запитати перевірку',
    verification_pending: 'Перевірка на розгляді',
    stat_show_up: 'Рівень присутності',
    stat_rating: 'Рейтинг гравця',
    stat_joined: 'Відвідано зустрічей',
    stat_hours: 'Зіграно годин',
    theme_appearance: 'Тема та темний режим',
    theme_light: 'Світла',
    theme_dark: 'Темна',
    want_to_play: 'Сповіщення «Хочу грати»',
    alerts_on: 'Увімкнено',
    alerts_off: 'Увімкнути',
    menu_metrics: 'Метрики, оцінки та постійні партнери',
    menu_notifications: 'Сповіщення',
    menu_settings: 'Налаштування застосунку',
    menu_switch_demo: 'Змінити демо-акаунт',
    btn_reset_demo: 'Скинути демо',
    btn_sign_out: 'Вийти з акаунта',
    language: 'Мова',

    // Language Picker Card
    language_card_title: 'Language / Мова / Język',
    language_card_subtitle: 'Оберіть мову інтерфейсу Leave The Room',

    // Policies Section
    policies_title: 'Довіра та безпека спільноти',
    policies_subtitle: 'Стандарти для безпечних та поважних зустрічей наживо',
    policy_guidelines_title: 'Правила спільноти',
    policy_guidelines_desc: 'Приходьте вчасно, попереджайте про запізнення в чаті та поважайте гравців будь-якого рівня.',
    policy_safety_title: 'Правила безпеки наживо',
    policy_safety_desc: 'Зустрічайтеся лише в публічних освітлених місцях (парки, кав’ярні, спортивні комплекси). Ніколи не зустрічайтеся вдома у незнайомців.',
    policy_terms_title: 'Умови використання',
    policy_terms_desc: 'Leave The Room сприяє спонтанній соціальній координації. Учасники несуть особисту відповідальність за безпеку та інвентар.',
    policy_privacy_title: 'Політика конфіденційності',
    policy_privacy_desc: 'Координати є приблизними. Ваша точна домашня адреса ніколи не збирається та не передається іншим.',

    // Reciprocal Mutual Rating
    rate_meetup_title: 'Оцінити учасників зустрічі',
    rate_meetup_subtitle: 'Взаємний відгук зміцнює довіру в реальній спільноті',
    rate_host_label: 'Оцінити організатора',
    rate_player_label: 'Оцінити учасника',
    did_they_show_up: 'Чи прийшла людина на зустріч?',
    showed_up_yes: 'Так, на місці',
    showed_up_no: 'Не прийшов(-ла)',
    sportsmanship_label: 'Спортивна етика та пунктуальність',
    rating_comment_placeholder: 'Короткий коментар про командну гру чи атмосферу (опція)...',
    btn_submit_rating: 'Надіслати взаємну оцінку',
    rating_submitted: 'Оцінку збережено!',
    instant_join: 'Швидкий вхід',
    search_placeholder: 'Пошук зустрічей...',
    available_meetups: 'Доступні зустрічі',
    sorted_by_distance: 'Сортування за відстанню та статусом',
    activity_type: 'Тип активності',
    i_understand: 'Я розумію',
    community_policies: 'Правила спільноти та безпека зустрічей',
    recurring_weekly: 'Щотижня',
  },

  pl: {
    // Brand & Tagline
    app_name: 'Leave The Room',
    brand_tagline: 'Wyjdź z pokoju: spontaniczne spotkania na żywo i zweryfikowani członkowie',
    verified_irl: 'ZWERYFIKOWANI CZŁONKOWIE',
    verified_members: 'ZWERYFIKOWANI CZŁONKOWIE',
    in_person_community: 'Społeczność spotkań na żywo',

    // Welcome & Auth Screen
    welcome_title: 'Leave The Room',
    welcome_sub: 'Koniec siedzenia w domu. Dołącz do spontanicznych gier, sportu i spotkań na żywo ze sprawdzonymi osobami w okolicy.',
    continue_google: 'Kontynuuj z Google',
    continue_apple: 'Kontynuuj z Apple',
    connecting_google: 'Łączenie z Google...',
    connecting_apple: 'Łączenie z Apple...',
    instant_oauth_notice: 'Błyskawiczne logowanie przez konto Google lub Apple. Bez dodatkowych haseł.',
    auth_verified_profiles: 'Zweryfikowane profile graczy',
    auth_local_spots: 'Lokalne miejsca spotkań',
    auth_error: 'Błąd logowania. Spróbuj ponownie.',

    // Navigation Labels
    nav_explore: 'Odkrywaj',
    nav_map: 'Mapa',
    nav_meetups: 'Moje spotkania',
    nav_profile: 'Profil',
    explore: 'Odkrywaj',
    map: 'Mapa',
    my_meetups: 'Spotkania',
    profile: 'Profil',

    // Explore Filter Bar & Headings
    explore_title: 'Przeglądaj spotkania',
    explore_subtitle: 'Aktywności na żywo w Twojej okolicy',
    all_activities: 'Wszystkie aktywności',
    cat_sports: 'Sport i fitness',
    cat_gaming: 'Gry i strategie',
    cat_social: 'Relaks i spotkania',
    cat_coworking: 'Coworking',
    status_all: 'Wszystkie',
    status_live: 'Na żywo teraz',
    status_upcoming: 'Nadchodzące',
    status_finished: 'Zakończone',
    radius_unit: '{radius} km',
    within_radius: 'W promieniu {radius} km',

    // Age Preference Options
    age_filter_all: 'Wszystkie grupy wiekowe',
    age_all: 'Wszystkie grupy wiekowe (18+)',
    age_18_25: '18–25',
    age_20s_30s: '20–39 lat',
    age_25_35: '25–35',
    age_30_plus: '30+',
    age_40_plus: '40+',

    // Meetup Cards & Badges
    live_now: 'NA ŻYWO TERAZ',
    in_30_mins: 'ZA 30 MIN',
    in_1_hour: 'ZA 1 GODZ',
    badge_live_now: 'NA ŻYWO TERAZ',
    badge_in_30_mins: 'ZA 30 MIN',
    badge_in_1_hour: 'ZA 1 GODZ',
    badge_later_today: 'DZIŚ PÓŹNIEJ',
    badge_finished: 'ZAKOŃCZONE',
    finished: 'ZAKOŃCZONE',
    join_spot: 'Dołącz',
    request_spot: 'Poproś o miejsce',
    joined: 'Dołączono',
    hosting: 'Prowadzisz',
    pending_approval: 'Czeka na akceptację',
    open_chat: 'Otwórz czat',
    see_details: 'Szczegóły',
    spots_left: 'Zostało {count} miejsc',
    spots_full: 'Brak miejsc',
    hosted_by: 'Organizator: {name}',

    // Empty States
    empty_explore_title: 'Brak spotkań w pobliżu',
    empty_explore_desc: 'Żadne aktywne spotkania nie pasują do filtrów. Zresetuj filtry lub utwórz spotkanie w 2 kliknięciach.',
    reset_filters: 'Zresetuj filtry',
    expand_radius: 'Zwiększ do 50 km',
    host_a_meetup: 'Zorganizuj spotkanie',

    // Host Creation Wizard
    create_modal_title: 'Utwórz spotkanie',
    step_1_category: '1. Kategoria i aktywność',
    step_2_details: '2. Tytuł, klimat i wiek',
    step_3_venue: '3. Miejsce spotkania',
    step_4_time: '4. Godzina rozpoczęcia',
    step_5_size: '5. Liczba uczestników',
    step_6_join_mode: '6. Tryb dołączania',
    custom_activity: '+ Własna aktywność',
    select_presets: 'Wybierz gotowe',
    custom_activity_placeholder: 'np. pickleball, spikeball, szachy, programowanie',
    title_label: 'Tytuł spotkania',
    title_placeholder: 'np. Mecz tenisa stołowego 1 na 1 w parku',
    equipment_note_label: 'Sprzęt',
    equipment_note_placeholder: 'np. Mam 2 zapasowe rakietki i piłeczki.',
    spot_clue_label: 'Wskazówka na miejscu (opcjonalnie)',
    spot_clue_placeholder: 'np. Stół nr 3 obok fontanny, zielona bluza z kapturem',
    skill_level_label: 'Poziom zaawansowania',
    skill_all_levels: 'Każdy poziom',
    skill_casual: 'Rekreacyjny',
    skill_competitive: 'Rywalizacja',
    target_age_label: 'Preferowany wiek',
    venue_name_label: 'Nazwa miejsca lub parku',
    venue_name_placeholder: 'Nazwa parku lub obiektu',
    venue_address_label: 'Ulica / Okolica',
    venue_address_placeholder: 'Ulica lub dzielnica',
    use_current_gps: 'Użyj GPS',
    start_now: 'Teraz',
    start_in_30: 'Za 30 min',
    start_in_60: 'Za 1 godz',
    start_later: 'Dziś później',
    join_mode_open_title: 'Otwarte (natychmiast)',
    join_mode_open_desc: 'Kto pierwszy, ten lepszy, do limitu graczy.',
    join_mode_approval_title: 'Wymaga akceptacji',
    join_mode_approval_desc: 'Przeglądaj prośby i akceptuj graczy 1 kliknięciem.',
    optional_cohost: 'Dodaj współorganizatora (opcjonalnie)',
    btn_cancel: 'Anuluj',
    btn_publish: 'Opublikuj spotkanie',
    btn_publishing: 'Publikowanie...',

    // Room Details & Arrival Status
    room_details_tab: 'Szczegóły',
    room_chat_tab: 'Czat wydarzenia',
    arrival_check_in_title: 'Status przybycia',
    arrival_here: 'Już jestem!',
    arrival_5m: 'Będę za 5 min',
    arrival_on_my_way: 'Jestem w drodze',
    arrival_late: '10 min spóźnienia',
    copy_address: 'Kopiuj adres',
    address_copied: 'Skopiowano!',
    leave_meetup: 'Opuść spotkanie',
    delete_meetup: 'Usuń spotkanie',

    // In-Room Chat Chips
    chat_chip_on_way: 'Jestem w drodze, będę za około 5 minut.',
    chat_chip_here: 'Już jestem na miejscu.',
    chat_chip_where: 'Przy którym stoliku lub boisku jesteście?',
    chat_chip_gear: 'Biorę dodatkowy sprzęt, do zobaczenia niebawem.',
    chat_input_placeholder: 'Napisz wiadomość do grupy...',
    btn_send: 'Wyślij',

    // My Meetups View
    tab_hosting: 'Moje wydarzenia',
    tab_joined: 'Dołączone',
    tab_past: 'Zakończone',
    empty_hosting: 'Nie organizujesz obecnie żadnych spotkań.',
    empty_joined: 'Nie dołączyłeś jeszcze do żadnych spotkań.',
    empty_past: 'Brak przeszłych spotkań.',

    // Profile View
    profile_title: 'Profil',
    verified_identity: 'Zweryfikowany profil członka',
    unverified_identity: 'Konto niezweryfikowane',
    request_verification: 'Poproś o weryfikację',
    verification_pending: 'Weryfikacja w toku',
    stat_show_up: 'Frekwencja',
    stat_rating: 'Ocena gracza',
    stat_joined: 'Dołączone spotkania',
    stat_hours: 'Godziny gry',
    theme_appearance: 'Wygląd i tryb ciemny',
    theme_light: 'Jasny',
    theme_dark: 'Ciemny',
    want_to_play: 'Powiadomienia „Chcę zagrać”',
    alerts_on: 'Aktywne',
    alerts_off: 'Włącz',
    menu_metrics: 'Statystyki, oceny i stali partnerzy',
    menu_notifications: 'Powiadomienia',
    menu_settings: 'Ustawienia aplikacji',
    menu_switch_demo: 'Przełącz konto demo',
    btn_reset_demo: 'Zresetuj demo',
    btn_sign_out: 'Wyloguj się',
    language: 'Język',

    // Language Picker Card
    language_card_title: 'Language / Мова / Język',
    language_card_subtitle: 'Wybierz język interfejsu Leave The Room',

    // Policies Section
    policies_title: 'Zaufanie i bezpieczeństwo społeczności',
    policies_subtitle: 'Standardy bezpiecznych i kulturalnych spotkań na żywo',
    policy_guidelines_title: 'Zasady społeczności',
    policy_guidelines_desc: 'Bądź punktualny, informuj o spóźnieniu na czacie i szanuj graczy na każdym poziomie.',
    policy_safety_title: 'Bezpieczeństwo spotkań na żywo',
    policy_safety_desc: 'Spotykaj się wyłącznie w miejscach publicznych (parki, kawiarnie, hale sportowe). Nigdy nie spotykaj się w mieszkaniach prywatnych.',
    policy_terms_title: 'Regulamin serwisu',
    policy_terms_desc: 'Leave The Room ułatwia spontaniczną koordynację społeczną. Członkowie odpowiadają osobiście za swoje bezpieczeństwo i sprzęt.',
    policy_privacy_title: 'Polityka prywatności',
    policy_privacy_desc: 'Lokalizacja jest przybliżona. Twój dokładny adres domowy nigdy nie jest zapisywany ani udostępniany innym.',

    // Reciprocal Mutual Rating
    rate_meetup_title: 'Oceń uczestników spotkania',
    rate_meetup_subtitle: 'Wzajemne opinie budują zaufanie w naszej społeczności',
    rate_host_label: 'Oceń organizatora',
    rate_player_label: 'Oceń gracza',
    did_they_show_up: 'Czy ta osoba pojawiła się na spotkaniu?',
    showed_up_yes: 'Tak, obecna',
    showed_up_no: 'Nieobecna',
    sportsmanship_label: 'Kultura gry i punktualność',
    rating_comment_placeholder: 'Krótki komentarz o atmosferze lub grze (opcjonalnie)...',
    btn_submit_rating: 'Prześlij wzajemną ocenę',
    rating_submitted: 'Ocena zapisana!',
    instant_join: 'Szybkie dołączenie',
    search_placeholder: 'Szukaj spotkań...',
    available_meetups: 'Dostępne spotkania',
    sorted_by_distance: 'Sortowane wg odległości i statusu',
    activity_type: 'Typ aktywności',
    i_understand: 'Rozumiem',
    community_policies: 'Zasady społeczności i bezpieczeństwo spotkań',
    recurring_weekly: 'Co tydzień',
  },

  de: {
    // Brand & Tagline
    app_name: 'Leave The Room',
    brand_tagline: 'Spontane Treffen vor Ort & verifizierte Mitglieder',
    verified_irl: 'VERIFIZIERTE MITGLIEDER',
    verified_members: 'VERIFIZIERTE MITGLIEDER',
    in_person_community: 'Treffen im echten Leben',

    // Welcome & Auth Screen
    welcome_title: 'Leave The Room',
    welcome_sub: 'Genug drinnen gesessen. Triff verifizierte Leute in deiner Nähe für spontane Sportarten, Spiele und Treffen vor Ort.',
    continue_google: 'Weiter mit Google',
    continue_apple: 'Weiter mit Apple',
    connecting_google: 'Verbindung mit Google...',
    connecting_apple: 'Verbindung mit Apple...',
    instant_oauth_notice: 'Direkte Anmeldung mit Google oder Apple. Kein separates Passwort nötig.',
    auth_verified_profiles: 'Verifizierte Mitgliederprofile',
    auth_local_spots: 'Lokale Treffpunkte',
    auth_error: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.',

    // Navigation Labels
    nav_explore: 'Entdecken',
    nav_map: 'Karte',
    nav_meetups: 'Meine Treffen',
    nav_profile: 'Profil',
    explore: 'Entdecken',
    map: 'Karte',
    my_meetups: 'Treffen',
    profile: 'Profil',

    // Explore Filter Bar & Headings
    explore_title: 'Treffen entdecken',
    explore_subtitle: 'Aktivitäten vor Ort in deiner Nähe',
    all_activities: 'Alle Aktivitäten',
    cat_sports: 'Sport & Fitness',
    cat_gaming: 'Spiele & Strategie',
    cat_social: 'Freizeit & Treffen',
    cat_coworking: 'Co-Working',
    status_all: 'Alle',
    status_live: 'Jetzt live',
    status_upcoming: 'Demnächst',
    status_finished: 'Beendet',
    radius_unit: '{radius} km',
    within_radius: 'Im Umkreis von {radius} km',

    // Age Preference Options
    age_filter_all: 'Alle Altersgruppen',
    age_all: 'Alle Altersgruppen (18+)',
    age_18_25: '18–25',
    age_20s_30s: '20er & 30er',
    age_25_35: '25–35',
    age_30_plus: '30+',
    age_40_plus: '40+',

    // Meetup Cards & Badges
    live_now: 'JETZT LIVE',
    in_30_mins: 'IN 30 MIN',
    in_1_hour: 'IN 1 STD',
    badge_live_now: 'JETZT LIVE',
    badge_in_30_mins: 'IN 30 MIN',
    badge_in_1_hour: 'IN 1 STD',
    badge_later_today: 'HEUTE SPÄTER',
    badge_finished: 'BEENDET',
    finished: 'BEENDET',
    join_spot: 'Mitmachen',
    request_spot: 'Platz anfragen',
    joined: 'Beigetreten',
    hosting: 'Du bist Host',
    pending_approval: 'Wartet auf Freigabe',
    open_chat: 'Chat öffnen',
    see_details: 'Details',
    spots_left: 'Noch {count} Plätze frei',
    spots_full: 'Voll',
    hosted_by: 'Host: {name}',

    // Empty States
    empty_explore_title: 'Keine Treffen in der Nähe gefunden',
    empty_explore_desc: 'Keine aktiven Treffen entsprechen den Filtern. Filter zurücksetzen oder in 2 Klicks ein Treffen starten.',
    reset_filters: 'Filter zurücksetzen',
    expand_radius: 'Auf 50 km erweitern',
    host_a_meetup: 'Treffen erstellen',

    // Host Creation Wizard
    create_modal_title: 'Treffen erstellen',
    step_1_category: '1. Kategorie & Aktivität',
    step_2_details: '2. Titel, Stimmung & Alter',
    step_3_venue: '3. Treffpunkt',
    step_4_time: '4. Startzeit',
    step_5_size: '5. Gruppengröße',
    step_6_join_mode: '6. Beitrittsmodus',
    custom_activity: '+ Eigene Aktivität',
    select_presets: 'Auswahl anzeigen',
    custom_activity_placeholder: 'z. B. Pickleball, Schach, Spikeball, Programmieren',
    title_label: 'Titel des Treffens',
    title_placeholder: 'z. B. 1v1 Tischtennis oder lockeres Match im Park',
    equipment_note_label: 'Ausrüstung',
    equipment_note_placeholder: 'z. B. Ich habe 2 extra Schläger und Bälle dabei.',
    spot_clue_label: 'Treffpunkt-Hinweis (optional)',
    spot_clue_placeholder: 'z. B. Tisch 3 beim Brunnen, grüner Hoodie',
    skill_level_label: 'Spielstärke',
    skill_all_levels: 'Alle Levels',
    skill_casual: 'Freizeit',
    skill_competitive: 'Wettkampf',
    target_age_label: 'Ziel-Altersgruppe',
    venue_name_label: 'Name des Orts / Parks',
    venue_name_placeholder: 'Park- oder Einrichtungsname',
    venue_address_label: 'Straße / Kreuzung',
    venue_address_placeholder: 'Kreuzung oder Stadtteil',
    use_current_gps: 'Aktuelles GPS',
    start_now: 'Jetzt',
    start_in_30: 'In 30 Min',
    start_in_60: 'In 1 Std',
    start_later: 'Heute später',
    join_mode_open_title: 'Sofortiger Beitritt (Offen)',
    join_mode_open_desc: 'Wer zuerst kommt, spielt mit, bis das Limit erreicht ist.',
    join_mode_approval_title: 'Host-Freigabe',
    join_mode_approval_desc: 'Anfragen prüfen und Teilnehmer mit 1 Klick annehmen.',
    optional_cohost: 'Optionalen Co-Host hinzufügen',
    btn_cancel: 'Abbrechen',
    btn_publish: 'Treffen veröffentlichen',
    btn_publishing: 'Wird veröffentlicht...',

    // Room Details & Arrival Status
    room_details_tab: 'Details',
    room_chat_tab: 'Gruppenchat',
    arrival_check_in_title: 'Ankunftsstatus',
    arrival_here: 'Ich bin da!',
    arrival_5m: 'In 5 Min da',
    arrival_on_my_way: 'Auf dem Weg',
    arrival_late: '10 Min Verspätung',
    copy_address: 'Adresse kopieren',
    address_copied: 'Kopiert!',
    leave_meetup: 'Treffen verlassen',
    delete_meetup: 'Treffen löschen',

    // In-Room Chat Chips
    chat_chip_on_way: 'Bin auf dem Weg, in ca. 5 Minuten da.',
    chat_chip_here: 'Ich bin jetzt vor Ort.',
    chat_chip_where: 'An welchem Tisch oder Platz seid ihr?',
    chat_chip_gear: 'Bringe extra Ausrüstung mit, bis gleich.',
    chat_input_placeholder: 'Nachricht an die Gruppe schreiben...',
    btn_send: 'Senden',

    // My Meetups View
    tab_hosting: 'Eigene Treffen',
    tab_joined: 'Beigetreten',
    tab_past: 'Vergangene',
    empty_hosting: 'Du organisierst aktuell keine Treffen.',
    empty_joined: 'Du bist noch keinem Treffen beigetreten.',
    empty_past: 'Keine vergangenen Treffen gefunden.',

    // Profile View
    profile_title: 'Profil',
    verified_identity: 'Verifiziertes Mitgliederprofil',
    unverified_identity: 'Konto nicht verifiziert',
    request_verification: 'Verifizierung anfordern',
    verification_pending: 'Verifizierung wird geprüft',
    stat_show_up: 'Zuverlässigkeit',
    stat_rating: 'Spieler-Bewertung',
    stat_joined: 'Treffen besucht',
    stat_hours: 'Gespielte Stunden',
    theme_appearance: 'Erscheinungsbild & Dark Mode',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    want_to_play: '„Möchte spielen“-Hinweise',
    alerts_on: 'Aktiv',
    alerts_off: 'Einschalten',
    menu_metrics: 'Statistiken, Bewertungen & Partner',
    menu_notifications: 'Benachrichtigungen',
    menu_settings: 'App-Einstellungen',
    menu_switch_demo: 'Demo-Konto wechseln',
    btn_reset_demo: 'Demo zurücksetzen',
    btn_sign_out: 'Abmelden',
    language: 'Sprache',

    // Language Picker Card
    language_card_title: 'Language / Мова / Język',
    language_card_subtitle: 'Sprache für Leave The Room wählen',

    // Policies Section
    policies_title: 'Vertrauen & Sicherheit in der Community',
    policies_subtitle: 'Regeln für sichere und respektvolle Treffen vor Ort',
    policy_guidelines_title: 'Community-Richtlinien',
    policy_guidelines_desc: 'Sei pünktlich, kündige Verspätungen im Chat an und respektiere Mitspieler aller Spielstärken.',
    policy_safety_title: 'Sicherheitsregeln vor Ort',
    policy_safety_desc: 'Triff dich nur an gut beleuchteten, öffentlichen Orten (Parks, Cafés, Sportzentren). Niemals in Privatwohnungen.',
    policy_terms_title: 'Nutzungsbedingungen',
    policy_terms_desc: 'Leave The Room erleichtert die spontane Koordination. Mitglieder übernehmen die Verantwortung für ihre eigene Sicherheit und Ausrüstung.',
    policy_privacy_title: 'Datenschutzerklärung',
    policy_privacy_desc: 'Standortangaben sind ungenau. Deine private Wohnadresse wird niemals erfasst oder an andere weitergegeben.',

    // Reciprocal Mutual Rating
    rate_meetup_title: 'Teilnehmer bewerten',
    rate_meetup_subtitle: 'Gegenseitiges Feedback schafft Vertrauen in unserer Gemeinschaft',
    rate_host_label: 'Host bewerten',
    rate_player_label: 'Spieler bewerten',
    did_they_show_up: 'Ist diese Person vor Ort erschienen?',
    showed_up_yes: 'Ja, erschienen',
    showed_up_no: 'Nicht erschienen',
    sportsmanship_label: 'Fairplay & Pünktlichkeit',
    rating_comment_placeholder: 'Kurzer Kommentar zu Teamgeist oder Stimmung (optional)...',
    btn_submit_rating: 'Gegenseitige Bewertung absenden',
    rating_submitted: 'Bewertung gespeichert!',
    instant_join: 'Sofort beitreten',
    search_placeholder: 'Treffen suchen...',
    available_meetups: 'Verfügbare Treffen',
    sorted_by_distance: 'Sortiert nach Entfernung und Status',
    activity_type: 'Aktivitätstyp',
    i_understand: 'Ich verstehe',
    community_policies: 'Community-Richtlinien & Sicherheit',
    recurring_weekly: 'Wöchentlich',
  },

  fr: {
    // Brand & Tagline
    app_name: 'Leave The Room',
    brand_tagline: 'Rencontres spontanées en personne & membres vérifiés',
    verified_irl: 'MEMBRES VÉRIFIÉS',
    verified_members: 'MEMBRES VÉRIFIÉS',
    in_person_community: 'Communauté de rencontres en personne',

    // Welcome & Auth Screen
    welcome_title: 'Leave The Room',
    welcome_sub: 'Ne restez plus enfermé. Rejoignez des parties spontanées, du sport et des rencontres en personne avec des joueurs vérifiés.',
    continue_google: 'Continuer avec Google',
    continue_apple: 'Continuer avec Apple',
    connecting_google: 'Connexion avec Google...',
    connecting_apple: 'Connexion avec Apple...',
    instant_oauth_notice: 'Connexion instantanée avec Google ou Apple. Aucun mot de passe requis.',
    auth_verified_profiles: 'Profils de membres vérifiés',
    auth_local_spots: 'Lieux de rencontre locaux',
    auth_error: 'Échec de la connexion. Veuillez réessayer.',

    // Navigation Labels
    nav_explore: 'Explorer',
    nav_map: 'Carte',
    nav_meetups: 'Mes rencontres',
    nav_profile: 'Profil',
    explore: 'Explorer',
    map: 'Carte',
    my_meetups: 'Rencontres',
    profile: 'Profil',

    // Explore Filter Bar & Headings
    explore_title: 'Découvrir les rencontres',
    explore_subtitle: 'Activités en personne autour de vous',
    all_activities: 'Toutes les activités',
    cat_sports: 'Sport & Fitness',
    cat_gaming: 'Jeux & Stratégie',
    cat_social: 'Détente & Sorties',
    cat_coworking: 'Co-Working',
    status_all: 'Tous',
    status_live: 'En cours',
    status_upcoming: 'À venir',
    status_finished: 'Terminé',
    radius_unit: '{radius} km',
    within_radius: 'Dans un rayon de {radius} km',

    // Age Preference Options
    age_filter_all: 'Tous âges',
    age_all: 'Tous âges (18+)',
    age_18_25: '18–25',
    age_20s_30s: '20–39 ans',
    age_25_35: '25–35',
    age_30_plus: '30+',
    age_40_plus: '40+',

    // Meetup Cards & Badges
    live_now: 'EN COURS',
    in_30_mins: 'DANS 30 MIN',
    in_1_hour: 'DANS 1 H',
    badge_live_now: 'EN COURS',
    badge_in_30_mins: 'DANS 30 MIN',
    badge_in_1_hour: 'DANS 1 H',
    badge_later_today: 'PLUS TARD AUJOURD’HUI',
    badge_finished: 'TERMINÉ',
    finished: 'TERMINÉ',
    join_spot: 'Rejoindre',
    request_spot: 'Demander une place',
    joined: 'Inscrit',
    hosting: 'Vous organisez',
    pending_approval: 'En attente',
    open_chat: 'Ouvrir le chat',
    see_details: 'Voir les détails',
    spots_left: '{count} places restantes',
    spots_full: 'Complet',
    hosted_by: 'Organisé par {name}',

    // Empty States
    empty_explore_title: 'Aucune rencontre trouvée à proximité',
    empty_explore_desc: 'Aucune rencontre active ne correspond à vos filtres. Réinitialisez les filtres ou lancez une rencontre en 2 clics.',
    reset_filters: 'Réinitialiser les filtres',
    expand_radius: 'Élargir à 50 km',
    host_a_meetup: 'Créer une rencontre',

    // Host Creation Wizard
    create_modal_title: 'Créer une rencontre',
    step_1_category: '1. Catégorie et activité',
    step_2_details: '2. Titre, ambiance et âge',
    step_3_venue: '3. Lieu de rendez-vous',
    step_4_time: '4. Heure de début',
    step_5_size: '5. Nombre de participants',
    step_6_join_mode: '6. Mode d’inscription',
    custom_activity: '+ Activité personnalisée',
    select_presets: 'Choisir parmi la liste',
    custom_activity_placeholder: 'ex. pickleball, spikeball, échecs, code',
    title_label: 'Titre de la rencontre',
    title_placeholder: 'ex. Match de ping-pong 1 contre 1 au parc',
    equipment_note_label: 'Matériel',
    equipment_note_placeholder: 'ex. J’ai 2 raquettes supplémentaires et des balles.',
    spot_clue_label: 'Repère sur place (optionnel)',
    spot_clue_placeholder: 'ex. Table 3 près de la fontaine, sweat à capuche vert',
    skill_level_label: 'Niveau de jeu',
    skill_all_levels: 'Tous niveaux',
    skill_casual: 'Loisir',
    skill_competitive: 'Compétition',
    target_age_label: 'Tranche d’âge souhaitée',
    venue_name_label: 'Nom du lieu ou parc',
    venue_name_placeholder: 'Parc ou complexe sportif',
    venue_address_label: 'Rue / Quartier',
    venue_address_placeholder: 'Intersection ou quartier',
    use_current_gps: 'Position GPS actuelle',
    start_now: 'Maintenant',
    start_in_30: 'Dans 30 min',
    start_in_60: 'Dans 1 h',
    start_later: 'Plus tard aujourd’hui',
    join_mode_open_title: 'Accès direct (Ouvert)',
    join_mode_open_desc: 'Premier arrivé, premier servi jusqu’à la limite de joueurs.',
    join_mode_approval_title: 'Validation par l’hôte',
    join_mode_approval_desc: 'Consultez les demandes et validez les joueurs en 1 clic.',
    optional_cohost: 'Ajouter un co-organisateur (optionnel)',
    btn_cancel: 'Annuler',
    btn_publish: 'Publier la rencontre',
    btn_publishing: 'Publication...',

    // Room Details & Arrival Status
    room_details_tab: 'Détails',
    room_chat_tab: 'Chat de groupe',
    arrival_check_in_title: 'Pointage d’arrivée',
    arrival_here: 'Je suis là !',
    arrival_5m: 'À 5 min',
    arrival_on_my_way: 'En route',
    arrival_late: '10 min de retard',
    copy_address: 'Copier l’adresse',
    address_copied: 'Copié !',
    leave_meetup: 'Quitter la rencontre',
    delete_meetup: 'Supprimer la rencontre',

    // In-Room Chat Chips
    chat_chip_on_way: 'Je suis en route, arrivée d’ici 5 minutes.',
    chat_chip_here: 'Je suis sur place maintenant.',
    chat_chip_where: 'À quelle table ou terrain êtes-vous ?',
    chat_chip_gear: 'J’apporte du matériel supplémentaire, à tout de suite.',
    chat_input_placeholder: 'Écrire un message au groupe...',
    btn_send: 'Envoyer',

    // My Meetups View
    tab_hosting: 'J’organise',
    tab_joined: 'Rejoints',
    tab_past: 'Passés',
    empty_hosting: 'Vous n’organisez aucune rencontre pour le moment.',
    empty_joined: 'Vous n’avez rejoint aucune rencontre pour l’instant.',
    empty_past: 'Aucune rencontre passée trouvée.',

    // Profile View
    profile_title: 'Profil',
    verified_identity: 'Profil de membre vérifié',
    unverified_identity: 'Compte non vérifié',
    request_verification: 'Demander la vérification',
    verification_pending: 'Vérification en cours',
    stat_show_up: 'Taux de présence',
    stat_rating: 'Évaluation du joueur',
    stat_joined: 'Rencontres rejointes',
    stat_hours: 'Heures jouées',
    theme_appearance: 'Apparence & Mode sombre',
    theme_light: 'Clair',
    theme_dark: 'Sombre',
    want_to_play: 'Alertes « Envie de jouer »',
    alerts_on: 'Actif',
    alerts_off: 'Activer',
    menu_metrics: 'Statistiques, avis & partenaires',
    menu_notifications: 'Notifications',
    menu_settings: 'Paramètres de l’application',
    menu_switch_demo: 'Changer de compte démo',
    btn_reset_demo: 'Réinitialiser la démo',
    btn_sign_out: 'Se déconnecter',
    language: 'Langue',

    // Language Picker Card
    language_card_title: 'Language / Мова / Język',
    language_card_subtitle: 'Choisissez la langue de Leave The Room',

    // Policies Section
    policies_title: 'Confiance & Sécurité de la communauté',
    policies_subtitle: 'Normes pour des rencontres en personne sûres et respectueuses',
    policy_guidelines_title: 'Règles de la communauté',
    policy_guidelines_desc: 'Soyez ponctuel, prévenez de vos retards sur le chat et respectez les joueurs de tous niveaux.',
    policy_safety_title: 'Règles de sécurité en personne',
    policy_safety_desc: 'Rencontrez-vous uniquement dans des lieux publics bien éclairés (parcs, cafés, complexes sportifs). Jamais au domicile de particuliers.',
    policy_terms_title: 'Conditions d’utilisation',
    policy_terms_desc: 'Leave The Room facilite la coordination sociale spontanée. Les membres assument l’entière responsabilité de leur sécurité physique et de leur matériel.',
    policy_privacy_title: 'Politique de confidentialité',
    policy_privacy_desc: 'Les coordonnées GPS sont approximatives. Votre adresse personnelle n’est jamais collectée ni divulguée aux autres.',

    // Reciprocal Mutual Rating
    rate_meetup_title: 'Évaluer les participants',
    rate_meetup_subtitle: 'Les évaluations réciproques renforcent la confiance au sein de la communauté',
    rate_host_label: 'Évaluer l’hôte',
    rate_player_label: 'Évaluer le joueur',
    did_they_show_up: 'Cette personne est-elle venue en personne ?',
    showed_up_yes: 'Oui, présente',
    showed_up_no: 'Absente',
    sportsmanship_label: 'Esprit sportif & ponctualité',
    rating_comment_placeholder: 'Court commentaire sur l’esprit d’équipe ou l’ambiance (optionnel)...',
    btn_submit_rating: 'Envoyer l’évaluation réciproque',
    rating_submitted: 'Évaluation enregistrée !',
    instant_join: 'Rejoindre directement',
    search_placeholder: 'Rechercher...',
    available_meetups: 'Rencontres disponibles',
    sorted_by_distance: 'Trié par distance et statut en direct',
    activity_type: 'Type d’activité',
    i_understand: 'J’ai compris',
    community_policies: 'Règles de la communauté & sécurité',
    recurring_weekly: 'Chaque semaine',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY['en'];

export function getTranslation(
  lang: SupportedLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = DICTIONARY[lang] || DICTIONARY.en;
  let text: string = (dict as any)[key] || (DICTIONARY.en as any)[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    });
  }

  return text;
}

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => DICTIONARY.en[key] || key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    try {
      const saved =
        (localStorage.getItem('ltr_language') as SupportedLanguage) ||
        (localStorage.getItem('seeme_language') as SupportedLanguage);
      if (saved && ['en', 'uk', 'pl', 'de', 'fr'].includes(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('ltr_language', lang);
      localStorage.setItem('seeme_language', lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return getTranslation(language, key, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation() {
  return useContext(I18nContext);
}

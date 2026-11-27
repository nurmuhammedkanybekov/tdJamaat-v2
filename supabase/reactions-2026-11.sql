-- Reactions in the chats: the "Аамин" button becomes a choice of reactions.
-- One reaction per person per message (choosing another replaces it), as in
-- Telegram. Earlier "Аамин"s are kept as 🤲.
-- Run once in the Supabase SQL editor. Safe to run again.

alter table house_message_amins add column if not exists emoji text;
update house_message_amins set emoji = '🤲' where emoji is null;
alter table house_message_amins alter column emoji set default '❤️';
alter table house_message_amins alter column emoji set not null;
alter table house_message_amins drop constraint if exists house_reaction_emoji;
alter table house_message_amins add constraint house_reaction_emoji
  check (emoji in ('❤️', '🤲', '🤝', '👍', '🙏', '😊', '🔥', '😁', '😂'));

alter table jamaat_message_amins add column if not exists emoji text;
update jamaat_message_amins set emoji = '🤲' where emoji is null;
alter table jamaat_message_amins alter column emoji set default '❤️';
alter table jamaat_message_amins alter column emoji set not null;
alter table jamaat_message_amins drop constraint if exists jamaat_reaction_emoji;
alter table jamaat_message_amins add constraint jamaat_reaction_emoji
  check (emoji in ('❤️', '🤲', '🤝', '👍', '🙏', '😊', '🔥', '😁', '😂'));

-- The default chats' names: "сөз" → "чат" (only if the admin has not renamed them).
update chat_rooms set name = 'Жамааттын чаты' where id = 'all' and name = 'Жамааттын сөзү';

-- Check: both columns exist.
select table_name, column_name from information_schema.columns
where column_name = 'emoji' and table_name in ('house_message_amins', 'jamaat_message_amins');

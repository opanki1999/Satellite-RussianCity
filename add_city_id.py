import os


def add_city_ids_line_by_line():
    # Путь к файлу
    file_path = 'russian-cities.js'

    # Читаем файл
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f'Файл {file_path} не найден')
        return
    except Exception as e:
        print(f'Ошибка чтения файла: {e}')
        return

    city_id = 1
    updated_lines = []
    in_array = False

    for line in lines:
        # Проверяем, находимся ли мы внутри массива RussianCities
        if 'const RussianCities = [' in line:
            in_array = True

        # Если находимся в массиве и строка содержит объект города
        if in_array and ('{name:' in line or '{name :' in line):
            # Добавляем city_id перед difficulty
            if 'difficulty:' in line:
                updated_line = line.replace('difficulty:', 'city_id: {}, difficulty:'.format(city_id))
                city_id += 1
            # Или перед закрывающей скобкой, если difficulty нет в этой строке
            elif '},' in line:
                updated_line = line.replace('},', ', city_id: {}}},'.format(city_id))
                city_id += 1
            elif line.strip().endswith('}'):
                updated_line = line.replace('}', ', city_id: {}}}'.format(city_id))
                city_id += 1
            else:
                updated_line = line
            updated_lines.append(updated_line)
        else:
            updated_lines.append(line)

        # Проверяем, закончился ли массив
        if in_array and '];' in line:
            in_array = False

    # Записываем обновленный контент обратно в файл
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            file.writelines(updated_lines)
        print('Файл успешно обновлен! Добавлены City_ID для всех городов.')
    except Exception as e:
        print(f'Ошибка записи файла: {e}')


if __name__ == '__main__':
    add_city_ids_line_by_line()
#[derive(Component)]
struct Person;

#[derive(Component)]
struct Name(String);


fn add_people(mut commands: Commands) {
    commands.spawn((Person, Name("Elaina Proctor".to_string())));
    commands.spawn((Person, Name("Renzo Hume".to_string())));
    commands.spawn((Person, Name("Zayna Nieves".to_string())));
}

fn main() {
    World::new()
        .add_startup_system(add_people)
        .run();
}


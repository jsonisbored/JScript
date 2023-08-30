type Sheep = {
	naked: bool,
	name: str,
};
const Sheep = {
	is_naked(self): bool {
	}
	shear(self): undefined {
	}
};
const Animal = {
	new(name): Sheep {
	}
	name(self): str {
	}
	noise(self): str {
	}
	talk(self): undefined {
		println("{} pauses briefly... {}", self.name, self.noise());
	}
};
let dolly: Sheep = Animal.new("Dolly");
dolly.talk();
dolly.shear();
dolly.talk();

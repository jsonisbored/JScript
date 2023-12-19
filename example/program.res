type sheep = {
	mutable naked: bool,
	mutable name: string,
};
module Sheep = {
	let rec is_naked = (self) => {
		self.naked
	}
	and let shear = (self) => {
		if (is_naked(self)) {
			Js.log(["{} is already naked...", name(self)]);
		} else {
			Js.log(["{} gets a haircut!", self.name]);
			self.naked = true;
		}
	}
};
module Animal = {
	let rec new = (name) => {
		Sheep({
			name: name,
			naked: false,
		})
	}
	and let name = (self) => {
		self.name
	}
	and let noise = (self) => {
		if (is_naked(self)) {
			"baaaaah?"
		} else {
			"baaaaah!"
		}
	}
	and let talk = (self) => {
		Js.log(["{} pauses briefly... {}", self.name, noise(self)]);
	}
};
let dolly: sheep = Sheep.new("Dolly");
dolly.talk();
dolly.shear();
dolly.talk();

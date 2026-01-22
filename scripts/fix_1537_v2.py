#!/usr/bin/env python3
"""Fix passage labels for mini-ielts/1537"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1537-australian-parrots-and-their-adaptation-to-habitat-change.json")
data = json.loads(json_path.read_text())

# === FIX: Correct passage with proper A-J labels ===
passage = """# Australian parrots and their adaptation to habitat change

**Paragraph A.**
Parrots are found across the tropic and in all southern hemisphere continents except Antarctica, but nowhere do they display such a richness of diversity and form as in Australia. One-sixth of the world's 345 parrot species are found there, and Australia has long been renowned for the number and variety of its parrots.

**Paragraph B.**
In the 16th century, the German cartographer Mercator made a world map that included a place, somewhere near present-day Australia, that he named Terra Psittacorum – the Land of Parrots – and the first European settlers in Australia often referred to the country as Parrot Land. In 1865, the celebrated British naturalist and wildlife artist John Gould said: "No group of birds gives Australia so tropical and benign an air as the numerous species of this great family by which it is tenanted."

**Paragraph C.**
Parrots are descendants of an ancient line. Due to their great diversity, and since most species inhabit Africa, Australia and South America, it seems almost certain that parrots originated millions of years ago on the ancient southern continent of Gondwana, before it broke up into the separate southern hemisphere continents we know today. Much of Gondwana comprised vast rainforests intersected by huge slow-flowing rivers and expansive lakes, but by eight million years ago, great changes were underway. The center of the continent of Australia had begun to dry out, and the rainforests that once covered it gradually contracted to the continental margins, where, to a limited extent, they still exist today.

**Paragraph D.**
The creatures that remained in those shrinking rainforests had to adapt to the drier conditions or face extinction. Reacting to these desperate circumstances, the parrot family, typically found in jungles in other parts of the world, has populated some of Australia's harshest environments. The parrots spread from ancestral forests through eucalypt woodlands to colonise the central deserts of Australia, and as a consequence they diversified into a wide range of species with adaptations that reflect the many changes animals and plants had to make to survive in these areas.

**Paragraph E.**
These evolutionary pressures helped mould keratin, the substance from which beaks are made, into a range of tools capable of gathering the new food types favored by various species of parrot. The size of a parrot's short, blunt beak and the length of that beak's curved upper part are related to the type of food each species eats. Some have comparatively long beaks that are perfect for extracting seeds from fruit; others have broader and stronger beaks that are designed for cracking hard seeds.

**Paragraph F.**
Differently shaped beaks are not the only adaptations that have been made during the developing relationship between parrots and their food plants. Like all of Australia's many honey-eating birds, the rainbow-coloured lorikeets and the flowers on which they feed have long co-evolved with features such as the shape and colour of the flowers adapted to the bird's particular needs. For example, red is the most attractive colour to birds, and thus flowers which depend on birds for pollination are more often red, and lorikeets' tongues have bristles which help them to collect as much pollen as possible.

**Paragraph G.**
Today, most of Australia's parrots inhabit woodland and open forest, and their numbers decline towards both deserts and wetter areas. The majority are nomadic to some degree, moving around to take advantage of feeding and breeding places. Two of the dry country parrots, the pink and grey galah and the pink, white and yellow corella have expanded their ranges in recent years. They are among the species that have adapted well to the changes brought about by European settlement – forest felling created grasslands where galahs and corellas thrive.

**Paragraph H.**
But other parrot species did not fare so well when their environments were altered. The clearing of large areas of rainforest is probably responsible for the disappearance of the double-eyed fig parrot, and numbers of ground parrots declined when a great part of their habitat was destroyed by the draining of coastal swamps. Even some parrot species that benefited from forest clearing at first are now confronted by a shortage of nesting sites due to further man-made changes.

**Paragraph I.**
New conditions also sometimes favour an incoming species over one that originally inhabited the area. For example, after farmers cleared large areas of forest on Kangaroo Island off the coast of South Australia, the island was colonised by galahs. They were soon going down holes and destroying black cockatoo eggs in order to take the hole for their own use. Their success precipitated a partial collapse in the black cockatoo population when the latter lost the struggle for scarce nesting hollows.

**Paragraph J.**
There may be no final answer to ensuring an equitable balance between parrot species. Nest box programmes help ease the shortage of nesting sites in some places, but there are not enough, they are expensive and they are not an adequate substitute for large, old trees, such as the habitat they represent and nectar, pollen and seeds they provide. Competition between parrots for nest sites is a result of the changes we humans have made to the Earth. We are the most widespread and dangerous competitors that parrots have ever had to face, but we also have the knowledge and skill to maintain the wonderfully rich diversity of Australia's parrots. All we need is the will to do so."""

data['sections'][0]['passage_md'] = passage
print("Fixed: Passage with proper A-J labels (removed duplicate labels)")

# Fix instruction_md to use A-J instead of A-L
data['sections'][0]['instruction_md'] = """**Questions 1-6:**
Which paragraph contains the following information?

Write the correct letter, **A-J**.

---

**Questions 7-9:**
Choose the correct letter, **A**, **B**, **C** or **D**.

---

**Questions 10-13:**
Complete the sentences below.

Write **NO MORE THAN TWO WORDS AND/OR A NUMBER** for each answer."""
print("Fixed: instruction_md with A-J sections")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")

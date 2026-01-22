#!/usr/bin/env python3
"""Comprehensive fix for mini-ielts/1540-the-dingo-debate"""
import json
from pathlib import Path

json_path = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1540-the-dingo-debate.json")
data = json.loads(json_path.read_text())

# === FIX 1: Fix truncated prompts from source ===
prompt_fixes = {
    1: "a description of a barrier designed to stop dingoes, which also divides two kinds of non-native animals",
    5: "research which has proved that dingoes have resorted to eating young livestock",
    7: "the way that the structure of dingo groups affects how quickly their numbers grow",
    8: "Dingoes tend to hunt native animals rather than hunting other non-native predators.",
    9: "The presence of dingoes puts the income of some people at risk.",
    10: "Dingoes have had little impact on the dying out of animal species in Australia.",
}

for q in data['questions']:
    if q['idx'] in prompt_fixes:
        old = q['prompt_md']
        q['prompt_md'] = prompt_fixes[q['idx']]
        print(f"Fixed Q{q['idx']}: prompt restored")

# === FIX 2: Fix passage with proper paragraph labels A-H ===
passage = """**Paragraph A.**
Besides 50,000 head of cattle, Carlton Hill is home to the dingo, Australia's largest mammalian predator and the bane of a grazier's (cattle farmer's) life. Stuart McKechnie, manager of Carlton Hill, complains that graziers' livelihoods are threatened when dingoes prey on cattle. But one man wants the baiting to end, and for dingoes to once again roam Australia's wide-open spaces. According to Chris Johnson of James Cook University, 'Australia needs more dingoes to protect our biodiversity.'

**Paragraph B.**
About 4,000 years ago, Asian sailors introduced dingoes to Australia. Throughout the ensuing millennia, these descendants of the wolf spread across the continent and, as the Tasmanian tiger disappeared completely from Australia, dingoes became Australia's top predators. As agricultural development took place, the European settlers found that they could not safely keep their livestock where dingoes roamed. So began one of the most sustained efforts at pest control in Australia's history. Over the last 150 years, dingoes have been shot and poisoned, and fences have been used in an attempt to keep them away from livestock. But at the same time, as the European settlers tried to eliminate one native pest from Australia, they introduced more of their own.

**Paragraph C.**
In 1860, the rabbit was unleashed on Australia by a wealthy landowner and by 1980 rabbits had covered most of the mainland. Rabbits provide huge prey base for two other introduced species: the feral (wild) cat and the red fox. The interaction between foxes, cats and rabbits is a huge problem for native mammals. In good years, rabbit numbers increase dramatically, and fox and cat populations grow quickly in response to the abundance of this prey. When bad seasons follow, rabbit numbers are significantly reduced - and the dwindling but still large fox and cat populations are left with little to eat besides native mammals.

**Paragraph D.**
Australian mammals generally reproduce much more slowly than rabbits, cats and foxes - an adaption to prevent overpopulation in the arid environment, where food can be scarce and unreliable - and populations decline because they can't grow fast enough to replace animals killed by the predators. Johnson says dingoes are the solution to this problem because they keep cat and fox populations under control. Besides regularly eating the smaller predators, dingoes will kill them simply to lessen competition. Dingo packs live in large, stable territories and generally have only one fertile, which limits their rate of increase. In the 4,000 years that dingoes have been Australia, they have contributed to few, if any, extinctions, Johnson says.

**Paragraph E.**
Reaching out from a desolate spot where three states meet, for 2,500 km in either direction, is the world's longest fence, two metres high and stretching from the coast in Queensland to the Great Australian Bight in South Australia; it is there to keep dingoes out of southeast, the fence separates the main types of livestock found in Australia. To the northwest of the fence, cattle predominate; to the southwest, sheep fill the landscape. In fact, Australia is a land dominated by these animals - 25 million cattle, 100 million sheep and just over 20 million people.

**Paragraph F.**
While there is no argument that dingoes will prey on sheep if given the chance, they don't hunt cattle once the calves are much past two or three weeks old, according to McKechnie. And a study in Queensland suggests that dingoes don't even prey heavily on the newborn calves unless their staple prey disappears due to deteriorating conditions like drought. This study, co-authored by Lee Allen of the Robert Wicks Research Centre in Queensland, suggests that the aggressive baiting programs used against dingoes may actually be counter-productive for graziers. When dingoes are removed from an area by baiting, the area is recolonized by younger, more solitary dingoes. These animals aren't capable of going after the large prey like kangaroos, so they turn to calves. In their study, some of the highest rates of calf predation occurred in areas that had been baited.

**Paragraph G.**
Mark Clifford, general manager of a firm that manages over 200,000 head of cattle, is not convinced by Allen's assertion. Clifford says, 'It's obvious if we drop or loosen control on dingoes, we are going to lose more calves.' He doesn't believe that dingoes will go after kangaroos when calves are around. Nor is he persuaded of dingoes' supposed ecological benefits, saying he is not convinced that they manage to catch cats that often, believing they are more likely to catch small native animals instead.

**Paragraph H.**
McKechnie agrees that dingoes kill the wallabies (small native animals) that compete with his cattle for food, but points out that in parts of Western Australia, there are no foxes, and not very many cats. He doesn't see how relaxing controls on dingoes in his area will improve the ecological balance. Johnson sees a need for a change in philosophy on the part of graziers. 'There might be a number of different ways of thinking through dingo management in cattle country,' he says. 'At the moment, though, that hasn't got through to graziers. There's still just one prescription, and that is to bait as widely as possible.'"""

data['sections'][0]['passage_md'] = passage
print("Fixed: Passage with proper A-H paragraph labels")

# === FIX 3: Fix instruction_md - change A-L to A-H ===
data['sections'][0]['instruction_md'] = """**Questions 1-7:**
Which section contains the following information?

Write the correct letter, **A-H**.

*NB: You may use any letter more than once.*

---

**Questions 8-10:**
Look at the following statements and the list of people below.

Match each statement with the correct person, **A**, **B**, **C** or **D**.

**List of People:**
- **A** Stuart McKechnie
- **B** Chris Johnson
- **C** Lee Allen
- **D** Mark Clifford

---

**Questions 11-13:**
Complete the sentences below.

Write **NO MORE THAN TWO WORDS** from the passage for each answer."""
print("Fixed: instruction_md with A-H sections and people list")

# Save
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"\nSaved fixes to {json_path}")

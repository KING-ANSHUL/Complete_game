export const NCERT_BOOKS: {
  [key: string]: {
    [key: string]: { bookName: string, chapters: { title: string; content?: string }[] } | undefined;
  }
} = {
    '1st': {},
    '2nd': {},
    '3rd': {},
    '4th': {},
    '5th': {},
    '6th': {
        'English': {
            bookName: 'Honeysuckle',
            chapters: [
                { 
                    title: "1. Who Did Patrick’s Homework?",
                    content: `Patrick never did homework. “Too boring,” he said. He played hockey and basketball and Nintendo instead. His teachers told him, “Patrick! Do your homework or you won’t learn a thing.” And it’s true, sometimes he did feel like an ignoramus. But what could he do? He hated homework.
                    Then one day he found his cat playing with a little doll and he grabbed it away. To his surprise, it wasn’t a doll at all, but a man of the tiniest size. He had a little wool shirt with old-fashioned britches and a high tall hat, much like a witch’s. He yelled, “Save me! Don’t give me back to that cat. I’ll grant you a wish, I promise you that.”
                    Patrick couldn’t believe how lucky he was! Here was the answer to all of his problems. So he said, “Only if you do all my homework till the end of the semester, that’s 35 days. If you do a good enough job, I could even get A’s.”
                    The little man’s face wrinkled like a dishcloth thrown in the hamper. He kicked his legs and doubled his fists and he grimaced and scowled and pursed his lips, “Oh, am I cursed! But I’ll do it.”
                    And true to his word, that little elf began to do Patrick’s homework. Except there was one glitch. The elf didn’t always know what to do and he needed help. “Help me! Help me!” he’d say. And Patrick would have to help — in whatever way.
                    “I don’t know this word,” the elf squeaked while reading Patrick’s homework. “Get me a dictionary. No, what’s even better? Look up the word and sound it out by each letter.”
                    When it came to maths, Patrick was out of luck. “What are times tables?” the elf shrieked. “We elves never need that. And addition and subtraction and division and fractions? Here, sit down beside me, you simply must guide me.” Elves know nothing of human history, to them it’s a mystery. So the little elf, already a shouter, just got louder. “Go to the library, I need books. More and more books. And you can help me read them too.”
                    As a matter of fact, every day in every way that little elf was a nag! Patrick was working harder than ever and was it a drag! He was staying up nights, had never felt so weary, was going to school with his eyes puffed and bleary.
                    Finally, the last day of school arrived and the elf was free to go. As for homework, there was no more, so he quietly and slyly slipped out the back door.
                    Patrick got his A’s; his classmates were amazed; his teachers smiled and were full of praise. And his parents? They wondered what had happened to Patrick. He was now the model kid. Cleaned his room, did his chores, was cheerful, never rude, like he had developed a whole new attitude.
                    You see, in the end, Patrick still thought he’d made that tiny man do all his homework. But I’ll share a secret, just between you and me. It wasn’t the elf; Patrick had done it himself!`
                },
                { title: "2. A House, A Home" },
                { title: "3. How the Dog Found Himself a New Master!" },
                { title: "4. The Kite" },
                { title: "5. A Different Kind of School" },
            ]
        },
        'Hindi': {
            bookName: 'Vasant',
            chapters: [
                { title: "1. वह चिड़िया जो" },
                { title: "2. बचपन" },
                { title: "3. नादान दोस्त" },
            ]
        },
        'Science': {
            bookName: 'Science',
            chapters: [
                { 
                    title: "1. Food: Where Does It Come From?",
                    content: `What did you eat at home today? Find out what your friend ate today. We all eat different kinds of food at different times, isn’t it? There seems to be so much variety in the food that we eat. What are these food items made of? Think about rice cooked at home. We take raw rice and boil it in water. Just two materials or ingredients are needed to prepare a dish of boiled rice. On the other hand, some food items are made with many ingredients. To prepare vegetable curry, we need different kinds of vegetables, salt, spices, oil and so on.
                    Food materials and sources. It may be easy for us to guess the sources of some of the ingredients. Fruits and vegetables, for instance. Where do they come from? Plants, of course! What are the sources of rice or wheat? Paddy or wheat fields, row after row. And then there are food items like milk, eggs, and meat, which come from animals.
                    Let us take the food items listed earlier and try to find out where they come from — the ingredients and their sources. Plants are the sources of food ingredients like grains, cereals, vegetables and fruits. Animals provide us with milk, meat products and eggs. Cows, goats and buffaloes are some common animals which give us milk. Milk and milk products like butter, cream, cheese and curd are used all over the world. Can you name some other animals which give us milk?
                    Plant parts and animal products as food. Plants are one source of our food. Which parts of a plant? We eat many leafy vegetables. We eat fruits of some plants. Sometimes roots, sometimes stems and even flowers. Have you ever eaten pumpkin flowers dipped in rice paste and fried? Try it! Some plants have two or more edible parts. Seeds of mustard plants give us oil and the leaves are used as a vegetable. Can you think of the different parts of a banana plant that are used as food?
                    Let us take some moong or chana seeds. Put a small quantity of seeds in a container filled with water and leave this aside for a day. Next day, drain the water completely and leave the seeds in the vessel. Wrap them with a piece of wet cloth and set aside. The following day, do you observe any changes in the seeds? A small white structure may have grown out of the seeds. If so, the seeds have sprouted. If not, wash the seeds in water, drain the water and leave them aside for another day, covered with a wet cloth. The next day, see if the seeds have sprouted. After washing these sprouted seeds, you can eat them. They can also be boiled. Add some spices and get a tasty snack to eat.
                    Do you know where honey comes from, or how it is produced? Have you seen a beehive where so many bees keep buzzing about? Bees collect nectar from flowers, convert it into honey and store it in their hive. Flowers and their nectar may be available only for a part of the year. So, bees store this nectar for their use all through the year. When we find such a beehive, we collect the food stored by the bees as honey.
                    What do animals eat? Do you have cattle or a pet that you take care of? A dog, cat, buffalo or a goat. You will then surely be aware of the food, the animal eats. What about other animals? Have you ever observed what a squirrel, pigeon, lizard or a small insect may be eating as their food? Animals which eat only plants are called herbivores. Animals which eat other animals are called carnivores. Animals which eat both plants as well as other animals are called omnivores.`
                },
                { title: "2. Components of Food" },
                { title: "3. Fibre to Fabric" },
            ]
        },
        'History': {
            bookName: 'Our Pasts - I',
            chapters: [
                { 
                    title: "1. What, Where, How and When?",
                    content: `Rashida's question. Rashida sat reading the newspaper. Suddenly, her eyes fell on a small headline: “One Hundred Years Ago.” How, she wondered, could anyone know what had happened so many years ago?
                    Finding out what happened. Yesterday: you could listen to the radio, watch television, read a newspaper. Last year: ask somebody who remembers. But what about long, long ago? Let us see how it can be done.
                    What can we know about the past? There are several things we can find out — what people ate, the kinds of clothes they wore, the houses in which they lived. We can find out about the lives of hunters, herders, farmers, rulers, merchants, priests, craft persons, artists, musicians, and scientists. We can also find out about the games children played, the stories they heard, the plays they saw, the songs they sang.
                    Where did people live? Find the river Narmada on the map. People have lived along the banks of this river for several hundred thousand years. Some of the earliest people who lived here were skilled gatherers, that is, people who gathered their food. They knew about the vast wealth of plants in the surrounding forests, and collected roots, fruits and other forest produce for their food. They also hunted animals.
                    Now find the Sulaiman and Kirthar hills to the northwest. Some of the areas where women and men first began to grow crops such as wheat and barley about 8000 years ago are located here. People also began rearing animals like sheep, goat, and cattle, and lived in villages. Locate the Garo hills to the north-east and the Vindhyas in central India. These were some of the other areas where agriculture developed. The places where rice was first grown are to the north of the Vindhyas.
                    Trace the river Indus and its tributaries. Tributaries are smaller rivers that flow into a larger river. About 4700 years ago, some of the earliest cities flourished on the banks of these rivers. Later, about 2500 years ago, cities developed on the banks of the Ganga and its tributaries, and along the sea coasts.
                    Names of the land. Two of the words we often use for our country are India and Bharat. The word India comes from the Indus, called Sindhu in Sanskrit. The Iranians and the Greeks who came through the northwest about 2500 years ago were familiar with the Indus, and called it the Hindos or the Indos, and the land to the east of the river was called India. The name Bharata was used for a group of people who lived in the northwest, and who are mentioned in the Rigveda, the earliest composition in Sanskrit (dated to about 3500 years ago). Later it was used for the country.
                    Finding out about the past. There are several ways of finding out about the past. One is to search for and read books that were written long ago. These are called manuscripts, because they were written by hand. These were usually written on palm leaf, or on the specially prepared bark of a tree known as the birch, which grows in the Himalayas. Over the years, many manuscripts were eaten away by insects, some were destroyed, but many have survived, often preserved in temples and monasteries. These books dealt with all kinds of subjects: religious beliefs and practices, the lives of kings, medicine and science.
                    We can also study inscriptions. These are writings on relatively hard surfaces such as stone or metal. Sometimes, kings got their orders inscribed so that people could see, read and obey them. There are other kinds of inscriptions as well, where men and women (including kings and queens) recorded what they did. For example, kings often kept records of victories in battle.
                    There are other things that were made and used in the past. Those who study these objects are called archaeologists. They study the remains of buildings made of stone and brick, paintings and sculpture. They also explore and excavate to find tools, weapons, pots, pans, ornaments and coins. Some of these objects may be made of stone, others of bone, baked clay or metal. Objects that are made of hard, imperishable substances usually survive for a long time. Archaeologists also look for bones of animals, birds, and fish, to find out what people ate in the past.
                    Historians, that is, scholars who study the past, use the word ‘source’ to refer to the information found from manuscripts, inscriptions and archaeology. Once sources are found, learning about the past becomes an adventure, as we reconstruct it bit by bit. So historians and archaeologists are like detectives, who use all these sources like clues to find out about our pasts.`
                },
                { title: "2. On the Trail of the Earliest People" },
                { title: "3. From Gathering to Growing Food" },
            ]
        },
        'Geography': {
            bookName: 'The Earth: Our Habitat',
            chapters: [
                { title: "1. The Earth in the Solar System" },
                { title: "2. Globe : Latitudes and Longitudes" },
                { title: "3. Motions of the Earth" },
            ]
        },
        'Civics': {
            bookName: 'Social and Political Life - I',
            chapters: [
                { title: "1. Understanding Diversity" },
                { title: "2. Diversity and Discrimination" },
                { title: "3. What is Government?" },
            ]
        }
    },
    '7th': {},
    '8th': {},
    '9th': {},
    '10th': {
        'English': {
            bookName: 'First Flight',
            chapters: [
                { title: "1. A Letter to God" },
                { title: "2. Nelson Mandela: Long Walk to Freedom" },
                { title: "3. Two Stories about Flying" },
            ]
        },
        'Hindi': {
            bookName: 'Kshitij-2',
            chapters: [
                { title: "1. पद" },
                { title: "2. राम-लक्ष्मण-परशुराम संवाद" },
            ]
        },
        'Science': {
            bookName: 'Science',
            chapters: [
                { title: "1. Chemical Reactions and Equations" },
                { title: "2. Acids, Bases and Salts" },
            ]
        },
        'History': {
            bookName: 'India and the Contemporary World - II',
            chapters: [
                { title: "1. The Rise of Nationalism in Europe" },
                { title: "2. Nationalism in India" },
            ]
        },
        'Geography': {
            bookName: 'Contemporary India - II',
            chapters: [
                { title: "1. Resources and Development" },
                { title: "2. Forest and Wildlife Resources" },
            ]
        },
        'Civics': {
            bookName: 'Democratic Politics - II',
            chapters: [
                { title: "1. Power-sharing" },
                { title: "2. Federalism" },
            ]
        },
        'Economics': {
            bookName: 'Understanding Economic Development',
            chapters: [
                { title: "1. Development" },
                { title: "2. Sectors of the Indian Economy" },
            ]
        }
    },
    '11th': {},
    '12th': {}
};
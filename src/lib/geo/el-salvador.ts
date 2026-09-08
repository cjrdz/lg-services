/**
 * El Salvador's geography, for locating properties.
 *
 * Important note on the 2023 reform: the 262 municipios were grouped into 44
 * (with names like "La Libertad Este" or "San Salvador Centro"). But nobody
 * searches for a house that way — they search "Santa Tecla", "Antiguo
 * Cuscatlán", "Sonsonate". So the model stores **departamento + distrito**
 * (the familiar names), which is how both the seller and the buyer think.
 *
 * If the 2023 municipio is ever needed for a legal document, it's derived
 * from a lookup table — a computed value, not something Lisbeth types in.
 */

export const DEPARTAMENTOS = [
	{ id: "ahuachapan", nombre: "Ahuachapán" },
	{ id: "santa-ana", nombre: "Santa Ana" },
	{ id: "sonsonate", nombre: "Sonsonate" },
	{ id: "chalatenango", nombre: "Chalatenango" },
	{ id: "la-libertad", nombre: "La Libertad" },
	{ id: "san-salvador", nombre: "San Salvador" },
	{ id: "cuscatlan", nombre: "Cuscatlán" },
	{ id: "la-paz", nombre: "La Paz" },
	{ id: "cabanas", nombre: "Cabañas" },
	{ id: "san-vicente", nombre: "San Vicente" },
	{ id: "usulutan", nombre: "Usulután" },
	{ id: "san-miguel", nombre: "San Miguel" },
	{ id: "morazan", nombre: "Morazán" },
	{ id: "la-union", nombre: "La Unión" },
] as const;

export type DepartamentoId = (typeof DEPARTAMENTOS)[number]["id"];

export const DEPARTAMENTO_IDS = DEPARTAMENTOS.map((d) => d.id) as unknown as [
	DepartamentoId,
	...DepartamentoId[],
];

interface Distrito {
	id: string;
	nombre: string;
}

/**
 * Districts per departamento. Used both for Keystatic's `select` options and
 * to validate at build time that the distrito really belongs to the chosen
 * departamento.
 */
export const DISTRITOS: Record<DepartamentoId, readonly Distrito[]> = {
	ahuachapan: [
		{ id: "ahuachapan", nombre: "Ahuachapán" },
		{ id: "apaneca", nombre: "Apaneca" },
		{ id: "atiquizaya", nombre: "Atiquizaya" },
		{ id: "concepcion-de-ataco", nombre: "Concepción de Ataco" },
		{ id: "el-refugio", nombre: "El Refugio" },
		{ id: "guaymango", nombre: "Guaymango" },
		{ id: "jujutla", nombre: "Jujutla" },
		{ id: "san-francisco-menendez", nombre: "San Francisco Menéndez" },
		{ id: "san-lorenzo", nombre: "San Lorenzo" },
		{ id: "san-pedro-puxtla", nombre: "San Pedro Puxtla" },
		{ id: "tacuba", nombre: "Tacuba" },
		{ id: "turin", nombre: "Turín" },
	],
	"santa-ana": [
		{ id: "santa-ana", nombre: "Santa Ana" },
		{ id: "candelaria-de-la-frontera", nombre: "Candelaria de la Frontera" },
		{ id: "chalchuapa", nombre: "Chalchuapa" },
		{ id: "coatepeque", nombre: "Coatepeque" },
		{ id: "el-congo", nombre: "El Congo" },
		{ id: "el-porvenir", nombre: "El Porvenir" },
		{ id: "masahuat", nombre: "Masahuat" },
		{ id: "metapan", nombre: "Metapán" },
		{ id: "san-antonio-pajonal", nombre: "San Antonio Pajonal" },
		{ id: "san-sebastian-salitrillo", nombre: "San Sebastián Salitrillo" },
		{ id: "santa-rosa-guachipilin", nombre: "Santa Rosa Guachipilín" },
		{ id: "santiago-de-la-frontera", nombre: "Santiago de la Frontera" },
		{ id: "texistepeque", nombre: "Texistepeque" },
	],
	sonsonate: [
		{ id: "sonsonate", nombre: "Sonsonate" },
		{ id: "acajutla", nombre: "Acajutla" },
		{ id: "armenia", nombre: "Armenia" },
		{ id: "caluco", nombre: "Caluco" },
		{ id: "cuisnahuat", nombre: "Cuisnahuat" },
		{ id: "izalco", nombre: "Izalco" },
		{ id: "juayua", nombre: "Juayúa" },
		{ id: "nahuizalco", nombre: "Nahuizalco" },
		{ id: "nahulingo", nombre: "Nahulingo" },
		{ id: "salcoatitan", nombre: "Salcoatitán" },
		{ id: "san-antonio-del-monte", nombre: "San Antonio del Monte" },
		{ id: "san-julian", nombre: "San Julián" },
		{ id: "santa-catarina-masahuat", nombre: "Santa Catarina Masahuat" },
		{ id: "santa-isabel-ishuatan", nombre: "Santa Isabel Ishuatán" },
		{ id: "santo-domingo-de-guzman", nombre: "Santo Domingo de Guzmán" },
		{ id: "sonzacate", nombre: "Sonzacate" },
	],
	chalatenango: [
		{ id: "chalatenango", nombre: "Chalatenango" },
		{ id: "agua-caliente", nombre: "Agua Caliente" },
		{ id: "arcatao", nombre: "Arcatao" },
		{ id: "citala", nombre: "Citalá" },
		{ id: "concepcion-quezaltepeque", nombre: "Concepción Quezaltepeque" },
		{ id: "dulce-nombre-de-maria", nombre: "Dulce Nombre de María" },
		{ id: "el-paraiso", nombre: "El Paraíso" },
		{ id: "la-palma", nombre: "La Palma" },
		{ id: "la-reina", nombre: "La Reina" },
		{ id: "nueva-concepcion", nombre: "Nueva Concepción" },
		{ id: "san-francisco-morazan", nombre: "San Francisco Morazán" },
		{ id: "san-ignacio", nombre: "San Ignacio" },
		{ id: "tejutla", nombre: "Tejutla" },
	],
	"la-libertad": [
		{ id: "santa-tecla", nombre: "Santa Tecla" },
		{ id: "antiguo-cuscatlan", nombre: "Antiguo Cuscatlán" },
		{ id: "chiltiupan", nombre: "Chiltiupán" },
		{ id: "ciudad-arce", nombre: "Ciudad Arce" },
		{ id: "colon", nombre: "Colón" },
		{ id: "comasagua", nombre: "Comasagua" },
		{ id: "huizucar", nombre: "Huizúcar" },
		{ id: "jayaque", nombre: "Jayaque" },
		{ id: "jicalapa", nombre: "Jicalapa" },
		{ id: "la-libertad", nombre: "La Libertad (Puerto)" },
		{ id: "nuevo-cuscatlan", nombre: "Nuevo Cuscatlán" },
		{ id: "opico", nombre: "San Juan Opico" },
		{ id: "quezaltepeque", nombre: "Quezaltepeque" },
		{ id: "sacacoyo", nombre: "Sacacoyo" },
		{ id: "san-jose-villanueva", nombre: "San José Villanueva" },
		{ id: "san-matias", nombre: "San Matías" },
		{ id: "san-pablo-tacachico", nombre: "San Pablo Tacachico" },
		{ id: "talnique", nombre: "Talnique" },
		{ id: "tamanique", nombre: "Tamanique" },
		{ id: "teotepeque", nombre: "Teotepeque" },
		{ id: "tepecoyo", nombre: "Tepecoyo" },
		{ id: "zaragoza", nombre: "Zaragoza" },
	],
	"san-salvador": [
		{ id: "san-salvador", nombre: "San Salvador" },
		{ id: "aguilares", nombre: "Aguilares" },
		{ id: "apopa", nombre: "Apopa" },
		{ id: "ayutuxtepeque", nombre: "Ayutuxtepeque" },
		{ id: "cuscatancingo", nombre: "Cuscatancingo" },
		{ id: "ciudad-delgado", nombre: "Ciudad Delgado" },
		{ id: "el-paisnal", nombre: "El Paisnal" },
		{ id: "guazapa", nombre: "Guazapa" },
		{ id: "ilopango", nombre: "Ilopango" },
		{ id: "mejicanos", nombre: "Mejicanos" },
		{ id: "nejapa", nombre: "Nejapa" },
		{ id: "panchimalco", nombre: "Panchimalco" },
		{ id: "rosario-de-mora", nombre: "Rosario de Mora" },
		{ id: "san-marcos", nombre: "San Marcos" },
		{ id: "san-martin", nombre: "San Martín" },
		{ id: "santiago-texacuangos", nombre: "Santiago Texacuangos" },
		{ id: "santo-tomas", nombre: "Santo Tomás" },
		{ id: "soyapango", nombre: "Soyapango" },
		{ id: "tonacatepeque", nombre: "Tonacatepeque" },
	],
	cuscatlan: [
		{ id: "cojutepeque", nombre: "Cojutepeque" },
		{ id: "candelaria", nombre: "Candelaria" },
		{ id: "el-carmen", nombre: "El Carmen" },
		{ id: "el-rosario", nombre: "El Rosario" },
		{ id: "monte-san-juan", nombre: "Monte San Juan" },
		{ id: "oratorio-de-concepcion", nombre: "Oratorio de Concepción" },
		{ id: "san-bartolome-perulapia", nombre: "San Bartolomé Perulapía" },
		{ id: "san-cristobal", nombre: "San Cristóbal" },
		{ id: "san-jose-guayabal", nombre: "San José Guayabal" },
		{ id: "san-pedro-perulapan", nombre: "San Pedro Perulapán" },
		{ id: "san-rafael-cedros", nombre: "San Rafael Cedros" },
		{ id: "san-ramon", nombre: "San Ramón" },
		{ id: "santa-cruz-analquito", nombre: "Santa Cruz Analquito" },
		{ id: "santa-cruz-michapa", nombre: "Santa Cruz Michapa" },
		{ id: "suchitoto", nombre: "Suchitoto" },
		{ id: "tenancingo", nombre: "Tenancingo" },
	],
	"la-paz": [
		{ id: "zacatecoluca", nombre: "Zacatecoluca" },
		{ id: "cuyultitan", nombre: "Cuyultitán" },
		{ id: "el-rosario-la-paz", nombre: "El Rosario" },
		{ id: "jerusalen", nombre: "Jerusalén" },
		{ id: "mercedes-la-ceiba", nombre: "Mercedes La Ceiba" },
		{ id: "olocuilta", nombre: "Olocuilta" },
		{ id: "paraiso-de-osorio", nombre: "Paraíso de Osorio" },
		{ id: "san-antonio-masahuat", nombre: "San Antonio Masahuat" },
		{ id: "san-emigdio", nombre: "San Emigdio" },
		{ id: "san-francisco-chinameca", nombre: "San Francisco Chinameca" },
		{ id: "san-juan-nonualco", nombre: "San Juan Nonualco" },
		{ id: "san-juan-talpa", nombre: "San Juan Talpa" },
		{ id: "san-juan-tepezontes", nombre: "San Juan Tepezontes" },
		{ id: "san-luis-la-herradura", nombre: "San Luis La Herradura" },
		{ id: "san-luis-talpa", nombre: "San Luis Talpa" },
		{ id: "san-miguel-tepezontes", nombre: "San Miguel Tepezontes" },
		{ id: "san-pedro-masahuat", nombre: "San Pedro Masahuat" },
		{ id: "san-pedro-nonualco", nombre: "San Pedro Nonualco" },
		{ id: "san-rafael-obrajuelo", nombre: "San Rafael Obrajuelo" },
		{ id: "santa-maria-ostuma", nombre: "Santa María Ostuma" },
		{ id: "santiago-nonualco", nombre: "Santiago Nonualco" },
		{ id: "tapalhuaca", nombre: "Tapalhuaca" },
	],
	cabanas: [
		{ id: "sensuntepeque", nombre: "Sensuntepeque" },
		{ id: "cinquera", nombre: "Cinquera" },
		{ id: "dolores", nombre: "Dolores" },
		{ id: "guacotecti", nombre: "Guacotecti" },
		{ id: "ilobasco", nombre: "Ilobasco" },
		{ id: "jutiapa", nombre: "Jutiapa" },
		{ id: "san-isidro", nombre: "San Isidro" },
		{ id: "tejutepeque", nombre: "Tejutepeque" },
		{ id: "victoria", nombre: "Victoria" },
	],
	"san-vicente": [
		{ id: "san-vicente", nombre: "San Vicente" },
		{ id: "apastepeque", nombre: "Apastepeque" },
		{ id: "guadalupe", nombre: "Guadalupe" },
		{ id: "san-cayetano-istepeque", nombre: "San Cayetano Istepeque" },
		{ id: "san-esteban-catarina", nombre: "San Esteban Catarina" },
		{ id: "san-ildefonso", nombre: "San Ildefonso" },
		{ id: "san-lorenzo-sv", nombre: "San Lorenzo" },
		{ id: "san-sebastian", nombre: "San Sebastián" },
		{ id: "santa-clara", nombre: "Santa Clara" },
		{ id: "santo-domingo", nombre: "Santo Domingo" },
		{ id: "tecoluca", nombre: "Tecoluca" },
		{ id: "tepetitan", nombre: "Tepetitán" },
		{ id: "verapaz", nombre: "Verapaz" },
	],
	usulutan: [
		{ id: "usulutan", nombre: "Usulután" },
		{ id: "alegria", nombre: "Alegría" },
		{ id: "berlin", nombre: "Berlín" },
		{ id: "california", nombre: "California" },
		{ id: "concepcion-batres", nombre: "Concepción Batres" },
		{ id: "el-triunfo", nombre: "El Triunfo" },
		{ id: "ereguayquin", nombre: "Ereguayquín" },
		{ id: "estanzuelas", nombre: "Estanzuelas" },
		{ id: "jiquilisco", nombre: "Jiquilisco" },
		{ id: "jucuapa", nombre: "Jucuapa" },
		{ id: "jucuaran", nombre: "Jucuarán" },
		{ id: "mercedes-umana", nombre: "Mercedes Umaña" },
		{ id: "nueva-granada", nombre: "Nueva Granada" },
		{ id: "ozatlan", nombre: "Ozatlán" },
		{ id: "puerto-el-triunfo", nombre: "Puerto El Triunfo" },
		{ id: "san-agustin", nombre: "San Agustín" },
		{ id: "san-buenaventura", nombre: "San Buenaventura" },
		{ id: "san-dionisio", nombre: "San Dionisio" },
		{ id: "san-francisco-javier", nombre: "San Francisco Javier" },
		{ id: "santa-elena", nombre: "Santa Elena" },
		{ id: "santa-maria", nombre: "Santa María" },
		{ id: "santiago-de-maria", nombre: "Santiago de María" },
		{ id: "tecapan", nombre: "Tecapán" },
	],
	"san-miguel": [
		{ id: "san-miguel", nombre: "San Miguel" },
		{ id: "carolina", nombre: "Carolina" },
		{ id: "chapeltique", nombre: "Chapeltique" },
		{ id: "chinameca", nombre: "Chinameca" },
		{ id: "chirilagua", nombre: "Chirilagua" },
		{ id: "ciudad-barrios", nombre: "Ciudad Barrios" },
		{ id: "comacaran", nombre: "Comacarán" },
		{ id: "el-transito", nombre: "El Tránsito" },
		{ id: "lolotique", nombre: "Lolotique" },
		{ id: "moncagua", nombre: "Moncagua" },
		{ id: "nueva-guadalupe", nombre: "Nueva Guadalupe" },
		{ id: "nuevo-eden-de-san-juan", nombre: "Nuevo Edén de San Juan" },
		{ id: "quelepa", nombre: "Quelepa" },
		{ id: "san-antonio-del-mosco", nombre: "San Antonio del Mosco" },
		{ id: "san-gerardo", nombre: "San Gerardo" },
		{ id: "san-jorge", nombre: "San Jorge" },
		{ id: "san-luis-de-la-reina", nombre: "San Luis de la Reina" },
		{ id: "san-rafael-oriente", nombre: "San Rafael Oriente" },
		{ id: "sesori", nombre: "Sesori" },
		{ id: "uluazapa", nombre: "Uluazapa" },
	],
	morazan: [
		{ id: "san-francisco-gotera", nombre: "San Francisco Gotera" },
		{ id: "arambala", nombre: "Arambala" },
		{ id: "cacaopera", nombre: "Cacaopera" },
		{ id: "chilanga", nombre: "Chilanga" },
		{ id: "corinto", nombre: "Corinto" },
		{ id: "delicias-de-concepcion", nombre: "Delicias de Concepción" },
		{ id: "el-divisadero", nombre: "El Divisadero" },
		{ id: "el-rosario-morazan", nombre: "El Rosario" },
		{ id: "gualococti", nombre: "Gualococti" },
		{ id: "guatajiagua", nombre: "Guatajiagua" },
		{ id: "joateca", nombre: "Joateca" },
		{ id: "jocoaitique", nombre: "Jocoaitique" },
		{ id: "jocoro", nombre: "Jocoro" },
		{ id: "lolotiquillo", nombre: "Lolotiquillo" },
		{ id: "meanguera", nombre: "Meanguera" },
		{ id: "osicala", nombre: "Osicala" },
		{ id: "perquin", nombre: "Perquín" },
		{ id: "san-carlos", nombre: "San Carlos" },
		{ id: "san-fernando-morazan", nombre: "San Fernando" },
		{ id: "san-isidro-morazan", nombre: "San Isidro" },
		{ id: "san-simon", nombre: "San Simón" },
		{ id: "sensembra", nombre: "Sensembra" },
		{ id: "sociedad", nombre: "Sociedad" },
		{ id: "torola", nombre: "Torola" },
		{ id: "yamabal", nombre: "Yamabal" },
		{ id: "yoloaiquin", nombre: "Yoloaiquín" },
	],
	"la-union": [
		{ id: "la-union", nombre: "La Unión" },
		{ id: "anamoros", nombre: "Anamorós" },
		{ id: "bolivar", nombre: "Bolívar" },
		{ id: "concepcion-de-oriente", nombre: "Concepción de Oriente" },
		{ id: "conchagua", nombre: "Conchagua" },
		{ id: "el-carmen-la-union", nombre: "El Carmen" },
		{ id: "el-sauce", nombre: "El Sauce" },
		{ id: "intipuca", nombre: "Intipucá" },
		{ id: "lislique", nombre: "Lislique" },
		{ id: "meanguera-del-golfo", nombre: "Meanguera del Golfo" },
		{ id: "nueva-esparta", nombre: "Nueva Esparta" },
		{ id: "pasaquina", nombre: "Pasaquina" },
		{ id: "poloros", nombre: "Polorós" },
		{ id: "san-alejo", nombre: "San Alejo" },
		{ id: "san-jose-la-union", nombre: "San José" },
		{ id: "santa-rosa-de-lima", nombre: "Santa Rosa de Lima" },
		{ id: "yayantique", nombre: "Yayantique" },
		{ id: "yucuaiquin", nombre: "Yucuaiquín" },
	],
};

export function esDepartamentoId(value: unknown): value is DepartamentoId {
	return typeof value === "string" && DEPARTAMENTOS.some((d) => d.id === value);
}

/** Validates at build time that the distrito belongs to the chosen departamento. */
export function distritoValido(departamento: string, distrito: string): boolean {
	if (!esDepartamentoId(departamento)) return false;
	return DISTRITOS[departamento].some((d) => d.id === distrito);
}

export function departamentoNombre(id: string): string {
	return DEPARTAMENTOS.find((d) => d.id === id)?.nombre ?? id;
}

export function distritoNombre(departamento: string, distrito: string): string {
	if (!esDepartamentoId(departamento)) return distrito;
	return DISTRITOS[departamento].find((d) => d.id === distrito)?.nombre ?? distrito;
}

/** "Santa Tecla, La Libertad" — as shown on a listing. */
export function ubicacionTexto(departamento: string, distrito: string): string {
	return `${distritoNombre(departamento, distrito)}, ${departamentoNombre(departamento)}`;
}

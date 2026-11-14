/**
 * Pre-built Spanish translation of the fictional sample document, so language
 * switching and Spanish read-aloud can be demonstrated without an API key.
 * Keys match buildTranslatable(SAMPLE_ANALYSIS).
 */
export const SAMPLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    "ui.whatHappened": "¿Qué pasó?",
    "ui.docSays": "Lo que dice su documento",
    "ui.simpleWords": "Lo que significa en palabras sencillas",
    "ui.directTranslation": "Traducción directa",
    "ui.diagnoses": "Su diagnóstico",
    "ui.glossary": "Palabras médicas explicadas",
    "ui.medications": "Sus medicamentos",
    "ui.expected": "Lo esperado durante la recuperación",
    "ui.contact": "Comuníquese con su proveedor de salud",
    "ui.emergency": "Emergencia: busque ayuda ahora",
    "ui.emergencyBanner":
      "Si cree que tiene una emergencia médica, llame al 911 o vaya a la sala de emergencias más cercana ahora. No espere.",
    "ui.checklist": "Lista de recuperación",
    "ui.followUp": "Atención de seguimiento",
    "ui.tests": "Pruebas que ordenó su médico",
    "ui.notInDoc": "No aparece en su documento",
    "ui.fromDoc": "De su documento",
    "ui.generalRef": "Guía general de seguridad",
    "ui.noGuidance":
      "Su documento no incluye suficientes señales de alerta para clasificar los síntomas. Llame a su médico o a la línea de enfermería si está preocupado. Llame al 911 en una emergencia.",
    "ui.notDiagnosis": "MedLens explica sus documentos. No da diagnósticos y no es un consejo médico.",

    "visit.reason": "Enfermedad del estómago con vómitos y diarrea, y una caída que lastimó su brazo izquierdo.",
    "summary.simple":
      "Usted fue a la sala de emergencias porque llevaba 2 días vomitando y con diarrea, y se sintió a punto de desmayarse y se cayó sobre su brazo izquierdo. Los médicos le dieron líquidos por la vena y medicina para las náuseas, y usted se sintió mejor. La radiografía de su brazo no mostró ningún hueso roto, y usted estaba lo bastante bien para irse a casa.",

    "dx.dx-1":
      "Una enfermedad repentina del estómago y los intestinos (a menudo llamada infección estomacal). Causó vómitos y diarrea, y su cuerpo perdió más agua de la que debía.",
    "dx.dx-2": "Un moretón profundo bajo la piel de su antebrazo izquierdo por la caída. La radiografía no mostró ningún hueso roto.",

    "med.med-1.purpose": "Náuseas y vómitos",
    "med.med-1.simple":
      "Si siente el estómago revuelto o vomita, deje que 1 tableta se disuelva en su lengua. Puede tomarla cada 8 horas si la necesita.",
    "med.med-2.purpose": "Dolor",
    "med.med-2.simple":
      "Para el dolor, tome 1 o 2 tabletas por la boca. Espere al menos 6 horas entre dosis. No tome más de 3,000 mg en 24 horas (eso son 6 tabletas).",
    "med.med-2.warn.0": "No tome más de 3,000 mg en 24 horas.",
    "med.med-2.warn.1":
      "Muchas medicinas para el resfriado y la gripe también contienen acetaminofén (Acetaminophen). Pregunte a su farmacéutico antes de tomarlas juntas.",
    "med.med-3.purpose": "Para reponer el agua y las sales perdidas por la diarrea",
    "med.med-3.simple": "Cada vez que tenga diarrea, beba despacio 8 onzas (1 taza) de la bebida de rehidratación.",
    "med.med-4.simple":
      "No tome su Lisinopril durante los próximos 2 días (48 horas). Vuelva a tomarlo cuando esté comiendo y bebiendo normalmente.",
    "med.med-4.verify":
      "Esto cambia una medicina que usted ya toma. Confirme con su médico o farmacéutico exactamente cuándo volver a tomarla.",

    "ins.ins-1.simple":
      "Empiece con bebidas claras como agua o caldo. Cuando no las vomite, agregue poco a poco comidas sencillas como plátano, arroz, puré de manzana y pan tostado.",
    "ins.ins-1.orig": "Avance la dieta según tolere; empiece con líquidos claros y luego alimentos blandos (dieta BRAT).",
    "ins.ins-2.simple": "Siga bebiendo líquidos. Fíjese en qué tan seguido orina: orinar menos puede significar que necesita más líquidos.",
    "ins.ins-2.orig": "Mantenga una hidratación oral adecuada. Vigile la cantidad de orina.",
    "ins.ins-3.simple":
      "Durante los próximos 2 días, póngase hielo en el antebrazo izquierdo por 20 minutos cada 2 a 3 horas. Mantenga el brazo elevado sobre una almohada cuando pueda.",
    "ins.ins-3.orig": "Aplique hielo en el antebrazo izquierdo 20 min cada 2–3 h por 48 h; eleve la extremidad.",
    "ins.ins-4.simple": "Levántese despacio. No maneje si se siente mareado o aturdido.",
    "ins.ins-4.orig": "Levántese despacio al estar acostado o sentado. Evite manejar mientras esté mareado.",
    "ins.ins-5.simple":
      "Lávese las manos con frecuencia. No prepare comida para otras personas hasta que lleve 2 días completos (48 horas) sin síntomas.",
    "ins.ins-5.orig": "Higiene de manos; evite preparar comida para otros hasta estar 48 h sin síntomas.",
    "ins.ins-6.simple":
      "No tome ibuprofeno (Advil, Motrin) ni naproxeno (Aleve) hasta que su médico revise sus riñones con un análisis de sangre.",
    "ins.ins-6.orig": "EVITAR: AINE (ibuprofeno, naproxeno) hasta que se vuelva a revisar la función de los riñones.",

    "gl.gl-1": "Una enfermedad repentina del estómago y los intestinos que causa vómitos y diarrea. A menudo se llama infección estomacal.",
    "gl.gl-2": "Una acumulación de sangre bajo la piel, a menudo llamada moretón profundo.",
    "gl.gl-3": "Sentir que está a punto de desmayarse: mareado, aturdido o débil.",
    "gl.gl-4": "Abreviatura de náuseas, vómitos y diarrea.",
    "gl.gl-5": "Solo cuando lo necesite. No en un horario fijo.",
    "gl.gl-6": "Cada 8 horas / cada 6 horas.",
    "gl.gl-7": "Por la boca.",
    "gl.gl-8": "Tableta que se disuelve en la boca: una pastilla que se derrite en la lengua sin agua.",
    "gl.gl-9": "El potasio en su sangre está más bajo de lo normal. El potasio ayuda a que sus músculos y su corazón funcionen.",
    "gl.gl-10": "Los análisis de sangre muestran que sus riñones están estresados porque su cuerpo no tenía suficiente líquido.",
    "gl.gl-11": "Un grupo de medicinas para el dolor que incluye el ibuprofeno y el naproxeno.",
    "gl.gl-12": "Un análisis de sangre que revisa sus riñones, el azúcar en la sangre y las sales del cuerpo como el potasio.",

    "g.gx-1": "Las heces sueltas pueden continuar por varios días.",
    "g.gx-2": "Sentirse un poco cansado y con poca hambre.",
    "g.gx-3": "El moretón de su antebrazo puede extenderse y cambiar de color, de morado a verde o amarillo, en 1 a 2 semanas.",
    "g.gc-1": "No puede retener líquidos por más de 12 horas.",
    "g.gc-2": "Tiene fiebre de 101°F (38.3°C) o más.",
    "g.gc-3": "La diarrea dura más de 3 días.",
    "g.gc-4": "Está orinando menos de lo normal.",
    "g.gc-5": "La hinchazón, el adormecimiento o el dolor de su antebrazo empeoran.",
    "g.ge-1": "Se desmaya o pierde el conocimiento.",
    "g.ge-2": "Sangre en el vómito o en las heces, o heces negras como alquitrán.",
    "g.ge-3": "Dolor de barriga fuerte o constante.",
    "g.ge-4": "Confusión o mucho sueño.",
    "g.ge-5": "No orina por 8 horas o más.",
    "g.ge-6": "Los dedos de su mano izquierda se ponen fríos, pálidos o azules.",
    "g.ge-7":
      "Dificultad para respirar, dolor de pecho o señales de una reacción alérgica grave, como hinchazón de la cara o la garganta.",

    "ck.ck-1": "Recoja sus nuevas medicinas (Ondansetron ODT y Acetaminophen) y la solución de rehidratación oral.",
    "ck.ck-2": "No tome Lisinopril por 48 horas. Vuelva a tomarlo cuando esté comiendo y bebiendo normalmente.",
    "ck.ck-2.timeframe": "Por 48 horas",
    "ck.ck-3": "Llame a la Dra. Priya Nair al (555) 013-4422 para hacer su cita de seguimiento.",
    "ck.ck-3.timeframe": "En 2–3 días",
    "ck.ck-4": "Hágase el análisis de sangre del panel metabólico básico (BMP) en su cita de seguimiento.",
    "ck.ck-4.timeframe": "En su cita de seguimiento (en 2–3 días)",
    "ck.ck-5": "Póngase hielo en el antebrazo izquierdo por 20 minutos cada 2–3 horas y manténgalo elevado.",
    "ck.ck-5.timeframe": "Por 48 horas",
    "ck.ck-6": "Beba 8 oz de solución de rehidratación oral después de cada evacuación suelta, y siga bebiendo líquidos.",
    "ck.ck-7": "Evite el ibuprofeno y el naproxeno hasta que se vuelva a revisar su análisis de sangre de los riñones.",
    "ck.ck-7.timeframe": "Hasta que se revise de nuevo la función de los riñones",
    "ck.ck-8": "Si el dolor de su antebrazo no mejora, pregúntele a la Dra. Nair si necesita otra radiografía.",
    "ck.ck-8.timeframe": "Si no mejora en 7–10 días",

    "fu.fu-1.timeframe": "En 2–3 días",
    "fu.fu-1.reason": "Revisar cómo se está recuperando y repetir sus análisis de sangre de potasio y riñones.",

    "ts.ts-1.explain":
      "Un análisis de sangre común con un tubo pequeño de sangre. Revisa sus riñones, el azúcar en la sangre y las sales del cuerpo como el potasio, que estaban alterados durante esta visita.",
    "ts.ts-1.timing": "En su cita de seguimiento en 2–3 días",
    "ts.ts-2.explain":
      "Una imagen rápida de los huesos de su brazo. Su primera radiografía no mostró ningún hueso roto. Solo se necesita otra si su dolor no mejora.",
    "ts.ts-2.timing": "Solo si el dolor no mejora en 7–10 días, según lo decida su médico",
  },
};

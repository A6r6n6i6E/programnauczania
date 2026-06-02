export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    const teacherName = String(data.teacherName || "").trim();
    const schoolName = String(data.schoolName || "").trim();
    const city = String(data.city || "").trim();
    const year = String(data.year || "").trim();

    if (!teacherName || !schoolName) {
      return Response.json(
        { success: false, error: "Brakuje imienia i nazwiska lub nazwy szkoły." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      `INSERT INTO program_prints 
       (teacher_name, school_name, city, year) 
       VALUES (?, ?, ?, ?)`
    )
      .bind(teacherName, schoolName, city, year)
      .run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: "Nie udało się zapisać danych przed wydrukiem." },
      { status: 500 }
    );
  }
}

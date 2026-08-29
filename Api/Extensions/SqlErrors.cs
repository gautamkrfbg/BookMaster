using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace BookMaster.Api.Extensions;

public static class SqlErrors
{
    public static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 };
}